<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Repair;
use App\Models\Payment;
use App\Models\PaymentDetail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with(['repair.car', 'details']);

        // Pour la démo, on retourne tout, mais on pourrait filtrer par utilisateur
        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'repair_id' => 'required|string', // Peut être ID numérique ou Firebase ID
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'transaction_id' => 'required|string|unique:payments,transaction_id',
            'phone_number' => 'nullable|string',
            'provider' => 'nullable|string',
        ]);

        try {
            Log::info("Tentative de paiement reçue:", $validated);
            
            return DB::transaction(function () use ($validated) {
                // Tenter de trouver par ID numérique d'abord, sinon par firebase_id
                $repair = is_numeric($validated['repair_id']) 
                    ? Repair::find($validated['repair_id'])
                    : Repair::where('firebase_id', $validated['repair_id'])->first();

                if (!$repair) {
                    Log::warning("Réparation non trouvée pour l'ID: " . $validated['repair_id']);
                    return response()->json(['message' => 'Réparation non trouvée (ID: ' . $validated['repair_id'] . ')'], 404);
                }

                Log::info("Réparation trouvée: ID=" . $repair->id);

                // 1. Créer le paiement
                $payment = Payment::create([
                    'repair_id' => $repair->id,
                    'amount' => $validated['amount'],
                    'payment_method' => $validated['payment_method'],
                    'transaction_id' => $validated['transaction_id'],
                    'status' => 'completed',
                ]);

                Log::info("Paiement créé: ID=" . $payment->id);

                // 2. Créer les détails du paiement
                PaymentDetail::create([
                    'payment_id' => $payment->id,
                    'phone_number' => $validated['phone_number'] ?? null,
                    'provider' => $validated['provider'] ?? null,
                ]);

                // 3. Mettre à jour le statut de la réparation
                $repair->update(['status' => 'paid']);
                Log::info("Statut réparation mis à jour en 'paid'");

                // 4. Synchroniser avec Firebase
                try {
                    Log::info("Lancement de la synchronisation Firebase...");
                    app(FirebaseSyncController::class)->sync();
                    Log::info("Synchronisation Firebase terminée.");
                } catch (\Exception $e) {
                    Log::error("Erreur synchro Firebase après paiement: " . $e->getMessage());
                }

                return response()->json([
                    'message' => 'Paiement effectué avec succès',
                    'payment' => $payment->load('details'),
                    'repair_status' => $repair->status
                ], 201);
            });
        } catch (\Exception $e) {
            Log::error("EXCEPTION lors du paiement: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors du traitement du paiement',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
