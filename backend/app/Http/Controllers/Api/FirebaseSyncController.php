<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Car;
use App\Models\Repair;
use App\Models\RepairItem;
use App\Models\Intervention;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;
use Google\Auth\Credentials\ServiceAccountCredentials;

use App\Models\Payment;
use App\Models\PaymentDetail;

class FirebaseSyncController extends Controller
{
    public function sync()
    {
        try {
            $projectId = 'garage-c0a05';
            $keyPath = storage_path('app/firebase-auth.json');
            
            if (!file_exists($keyPath)) {
                return response()->json(['message' => 'Fichier de configuration Firebase manquant.'], 500);
            }

            $keyFile = json_decode(file_get_contents($keyPath), true);
            
            // Authentification
            $credentials = new ServiceAccountCredentials(
                'https://www.googleapis.com/auth/datastore',
                $keyFile
            );
            $token = $credentials->fetchAuthToken();
            $accessToken = $token['access_token'];

            $client = new Client();

            // 1. PUSH : Envoyer les statuts locaux vers Firebase
            $this->pushStatusesToFirebase($client, $projectId, $accessToken);

            // 2. PULL : Récupérer les données depuis Firebase (logique existante)
            $this->pullRepairsFromFirebase($client, $projectId, $accessToken);

            // 3. PULL PAYMENTS : Récupérer les nouveaux paiements depuis Firebase
            $paymentCount = $this->pullPaymentsFromFirebase($client, $projectId, $accessToken);

            return response()->json([
                'message' => 'Synchronisation réussie !',
                'payments_synced' => $paymentCount
            ]);

        } catch (\Exception $e) {
            Log::error('Firebase Sync Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la synchronisation : ' . $e->getMessage()
            ], 500);
        }
    }

    private function pullRepairsFromFirebase(Client $client, $projectId, $accessToken)
    {
        $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/repairs";

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
            
            $userEmail = $this->getFirestoreValue($fields['userEmail'] ?? null);
            if (!$userEmail) continue;

            $firebaseUid = $this->getFirestoreValue($fields['userId'] ?? null);

            $user = User::updateOrCreate(
                ['email' => $userEmail],
                [
                    'name' => $this->getFirestoreValue($fields['userName'] ?? null) ?: explode('@', $userEmail)[0],
                    'password' => Hash::make('password'),
                    'firebase_uid' => $firebaseUid
                ]
            );

            $car = Car::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'license_plate' => $this->getFirestoreValue($fields['immatriculation'] ?? null)
                ],
                [
                    'model' => $this->getFirestoreValue($fields['modele'] ?? null),
                    'description' => $this->getFirestoreValue($fields['panne'] ?? null)
                ]
            );

            $createdAt = isset($fields['createdAt']) ? $this->getFirestoreValue($fields['createdAt']) : now();

            $repair = Repair::updateOrCreate(
                ['firebase_id' => $firebaseId],
                [
                    'car_id' => $car->id,
                    'status' => $this->mapStatus($this->getFirestoreValue($fields['statut'] ?? null) ?? 'En attente'),
                    'created_at' => $createdAt
                ]
            );

            $type = $this->getFirestoreValue($fields['type'] ?? null);
            $intervention = Intervention::where('name', $type)->first();
            if ($intervention) {
                RepairItem::updateOrCreate(
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
    }

    private function pullPaymentsFromFirebase(Client $client, $projectId, $accessToken)
    {
        // On récupère les paiements non encore synchronisés
        $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/payments";
        
        try {
            $response = $client->get($url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Accept'        => 'application/json',
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            $documents = $data['documents'] ?? [];
            $count = 0;

            foreach ($documents as $doc) {
                $fields = $doc['fields'];
                $firebaseId = basename($doc['name']);
                
                // Si déjà synchronisé, on peut passer (ou vérifier localement)
                if (Payment::where('firebase_id', $firebaseId)->exists()) continue;

                $firestoreRepairId = $this->getFirestoreValue($fields['firestore_repair_id'] ?? null);
                $amount = $this->getFirestoreValue($fields['amount'] ?? null);
                $transactionId = $this->getFirestoreValue($fields['transaction_id'] ?? null);
                $method = $this->getFirestoreValue($fields['payment_method'] ?? null) ?: 'mobile_money';

                // Trouver la réparation locale
                $repair = Repair::where('firebase_id', $firestoreRepairId)->first();
                
                if ($repair) {
                    // Créer le paiement localement
                    $payment = Payment::create([
                        'firebase_id' => $firebaseId,
                        'repair_id' => $repair->id,
                        'amount' => $amount,
                        'payment_method' => $method,
                        'transaction_id' => $transactionId,
                        'status' => 'completed'
                    ]);

                    // Créer les détails du paiement
                    PaymentDetail::create([
                        'payment_id' => $payment->id,
                        'phone_number' => '0340000000', // Par défaut
                        'provider' => 'Orange Money'
                    ]);

                    // Mettre à jour le statut de la réparation si nécessaire (par exemple vers 'completed' si ce n'était pas déjà fait)
                    if ($repair->status === 'pending' || $repair->status === 'in_progress') {
                        $repair->update(['status' => 'completed']);
                    }
                    
                    $count++;
                    
                    // Optionnel : marquer comme synchronisé dans Firebase via PATCH
                    // Pour l'instant on se base sur l'existence locale via firebase_id
                }
            }
            return $count;
        } catch (\Exception $e) {
            Log::error('Pull Payments Error: ' . $e->getMessage());
            return 0;
        }
    }

    private function getFirestoreValue($field)
    {
        if (!isset($field) || empty($field)) return null;
        return reset($field);
    }

    private function mapStatus($firebaseStatus)
    {
        $map = [
            'En attente' => 'pending',
            'En cours' => 'in_progress',
            'Terminé' => 'completed'
        ];

        return $map[$firebaseStatus] ?? 'pending';
    }

    private function pushStatusesToFirebase(Client $client, $projectId, $accessToken)
    {
        $repairs = Repair::whereNotNull('firebase_id')->get();

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

                // Ajouter une notification dans Firestore si le statut est 'completed' ou 'waiting_for_payment'
                // et si on n'a pas encore notifié pour cette réparation
                if (($repair->status === 'completed' || $repair->status === 'waiting_for_payment') && !$repair->notified) {
                    if ($this->addNotificationToFirebase($client, $projectId, $accessToken, $repair)) {
                        $repair->update(['notified' => true]);
                    }
                }

                // Réinitialiser le flag notified si le statut repasse en 'pending' ou 'in_progress'
                if ($repair->status === 'pending' || $repair->status === 'in_progress') {
                    $repair->update(['notified' => false]);
                }
            } catch (\Exception $e) {
                Log::error("Erreur push Firebase pour {$repair->firebase_id} : " . $e->getMessage());
            }
        }
    }

    private function mapStatusToFirebase($status)
    {
        $map = [
            'pending' => 'En attente',
            'in_progress' => 'En cours',
            'completed' => 'Terminé',
            'waiting_for_payment' => 'En attente de paiement'
        ];

        return $map[$status] ?? 'En attente';
    }

    private function addNotificationToFirebase(Client $client, $projectId, $accessToken, $repair)
    {
        // On récupère le userId via la réparation (car -> user -> firebase_id)
        $user = $repair->car->user;
        if (!$user || !$user->firebase_uid) return false;

        $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/notifications";
        
        $message = "Votre {$repair->car->model} est prête !";
        if ($repair->status === 'waiting_for_payment') {
            $message = "Les travaux sur votre {$repair->car->model} sont finis. En attente de règlement.";
        }

        try {
            $response = $client->post($url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'fields' => [
                        'userId' => ['stringValue' => $user->firebase_uid],
                        'title' => ['stringValue' => 'Réparation terminée'],
                        'message' => ['stringValue' => $message],
                        'carId' => ['stringValue' => $repair->firebase_id],
                        'read' => ['booleanValue' => false],
                        'date' => ['timestampValue' => now()->toRfc3339String()]
                    ]
                ]
            ]);

            return $response->getStatusCode() === 200 || $response->getStatusCode() === 201;
        } catch (\Exception $e) {
            Log::error("Erreur ajout notification Firebase : " . $e->getMessage());
            return false;
        }
    }
}
