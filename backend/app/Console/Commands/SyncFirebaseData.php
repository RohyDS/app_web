<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncFirebaseData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-firebase-data';
    protected $description = 'Synchroniser les données depuis Firebase Firestore';

    public function handle()
    {
        $this->info('Début de la synchronisation Firebase...');

        try {
            $projectId = 'garage-c0a05';
            $keyFile = json_decode(file_get_contents(storage_path('app/firebase-auth.json')), true);
            
            // Obtenir le token d'accès
            $this->info('Authentification Firebase...');
            $credentials = new \Google\Auth\Credentials\ServiceAccountCredentials(
                'https://www.googleapis.com/auth/datastore',
                $keyFile
            );
            $token = $credentials->fetchAuthToken();
            $accessToken = $token['access_token'];

            $client = new \GuzzleHttp\Client();

            // 1. PUSH : Envoyer les statuts locaux vers Firebase
            $this->info('Mise à jour des statuts locaux vers Firebase...');
            $this->pushStatusesToFirebase($client, $projectId, $accessToken);

            // 2. PULL : Récupérer les données depuis Firebase
            $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/repairs";

            $this->info('Récupération des réparations depuis Firestore REST API...');
            $response = $client->get($url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Accept'        => 'application/json',
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            $documents = $data['documents'] ?? [];

            foreach ($documents as $doc) {
                $fields = $doc['fields'];
                $firebaseId = basename($doc['name']);
                
                // Helper pour extraire les valeurs du format Firestore REST
                $getValue = function($field) {
                    if (!isset($field)) return null;
                    return reset($field);
                };

                $userEmail = $getValue($fields['userEmail'] ?? null);
                $this->line("Traitement de la réparation pour: " . ($userEmail ?? 'Inconnu'));

                if (!$userEmail) continue;

                // Créer ou mettre à jour l'utilisateur
                $user = \App\Models\User::updateOrCreate(
                    ['email' => $userEmail],
                    [
                        'name' => $getValue($fields['userName'] ?? null) ?: explode('@', $userEmail)[0],
                        'password' => \Illuminate\Support\Facades\Hash::make('password'),
                    ]
                );

                // Créer ou mettre à jour la voiture
                $car = \App\Models\Car::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'license_plate' => $getValue($fields['immatriculation'] ?? null)
                    ],
                    [
                        'model' => $getValue($fields['modele'] ?? null),
                        'description' => $getValue($fields['panne'] ?? null)
                    ]
                );

                // Date de création
                $createdAt = isset($fields['createdAt']) ? $getValue($fields['createdAt']) : now();

                // Créer la réparation avec firebase_id
                $repair = \App\Models\Repair::updateOrCreate(
                    [
                        'firebase_id' => $firebaseId
                    ],
                    [
                        'car_id' => $car->id,
                        'status' => $this->mapStatus($getValue($fields['statut'] ?? null) ?? 'En attente'),
                        'total_amount' => 0,
                        'created_at' => $createdAt
                    ]
                );

                // Trouver l'intervention correspondante
                $type = $getValue($fields['type'] ?? null);
                $intervention = \App\Models\Intervention::where('name', $type)->first();
                if ($intervention) {
                    \App\Models\RepairItem::updateOrCreate(
                        [
                            'repair_id' => $repair->id,
                            'intervention_id' => $intervention->id
                        ],
                        [
                            'price' => $intervention->price,
                            'remaining_time' => $intervention->duration
                        ]
                    );
                    $repair->update(['total_amount' => $intervention->price]);
                }
            }

            $this->info('Synchronisation terminée avec succès !');

        } catch (\Exception $e) {
            $this->error('Erreur lors de la synchronisation : ' . $e->getMessage());
        }
    }

    private function mapStatus($firebaseStatus)
    {
        $map = [
            'En attente' => 'pending',
            'En cours' => 'in_progress',
            'Terminé' => 'completed',
            'Payé' => 'paid'
        ];

        return $map[$firebaseStatus] ?? 'pending';
    }

    private function pushStatusesToFirebase($client, $projectId, $accessToken)
    {
        $repairs = \App\Models\Repair::whereNotNull('firebase_id')->get();

        foreach ($repairs as $repair) {
            try {
                $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/repairs/{$repair->firebase_id}?updateMask.fieldPaths=statut&updateMask.fieldPaths=slot_number&updateMask.fieldPaths=montant";
                
                $firebaseStatus = $this->mapStatusToFirebase($repair->status);

                $client->patch($url, [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $accessToken,
                        'Content-Type' => 'application/json',
                    ],
                    'json' => [
                        'fields' => [
                            'statut' => ['stringValue' => $firebaseStatus],
                            'slot_number' => ['integerValue' => $repair->slot_number ?? 0],
                            'montant' => ['doubleValue' => (double)$repair->total_amount]
                        ]
                    ]
                ]);
                $this->line("Statut poussé pour {$repair->firebase_id} : {$firebaseStatus}");
            } catch (\Exception $e) {
                $this->error("Erreur push Firebase pour {$repair->firebase_id} : " . $e->getMessage());
            }
        }
    }

    private function mapStatusToFirebase($status)
    {
        $map = [
            'pending' => 'En attente',
            'in_progress' => 'En cours',
            'completed' => 'Terminé',
            'paid' => 'Payé'
        ];

        return $map[$status] ?? 'En attente';
    }
}
