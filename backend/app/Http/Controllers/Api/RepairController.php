<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Repair;
use App\Models\RepairItem;
use App\Models\Intervention;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;
use Google\Auth\Credentials\ServiceAccountCredentials;

class RepairController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(Repair::with(['car.user', 'items.intervention'])->withSum('payments', 'amount')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'car_id' => 'required|exists:cars,id',
            'interventions' => 'required|array',
            'interventions.*' => 'exists:interventions,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $repair = Repair::create([
                'car_id' => $validated['car_id'],
                'status' => 'pending',
                'total_amount' => 0,
            ]);

            $totalAmount = 0;
            foreach ($validated['interventions'] as $interventionId) {
                $intervention = Intervention::find($interventionId);
                RepairItem::create([
                    'repair_id' => $repair->id,
                    'intervention_id' => $interventionId,
                    'status' => 'pending',
                    'remaining_time' => $intervention->duration * 60, // Convert to seconds
                ]);
                $totalAmount += $intervention->price;
            }

            $repair->update(['total_amount' => $totalAmount]);

            return response()->json($repair->load('items.intervention'), 201);
        });
    }

    /**
     * Update repair status.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $repair = Repair::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,completed,waiting_for_payment',
            'slot_number' => 'nullable|integer|in:1,2',
        ]);

        // Vérifier la capacité du garage si on passe en "En cours"
        if ($validated['status'] === 'in_progress' && $repair->status !== 'in_progress') {
            $busySlots = Repair::where('status', 'in_progress')->pluck('slot_number')->toArray();
            if (count($busySlots) >= 2) {
                return response()->json([
                    'message' => 'Le garage est déjà complet (2 voitures en cours). Terminez une réparation avant d\'en commencer une nouvelle.'
                ], 422);
            }
            
            // Attribuer un slot automatiquement si non fourni
            if (!isset($validated['slot_number'])) {
                $validated['slot_number'] = in_array(1, $busySlots) ? 2 : 1;
            }
        }

        if ($validated['status'] === 'in_progress' && !$repair->started_at) {
            $repair->started_at = now();
        }

        if ($validated['status'] === 'completed' && !$repair->completed_at) {
            $repair->completed_at = now();
        }

        $repair->update($validated);

        // Déclencher la synchronisation vers Firebase pour mettre à jour le statut en temps réel
        try {
            app(\App\Http\Controllers\Api\FirebaseSyncController::class)->sync();
        } catch (\Exception $e) {
            Log::error("Erreur lors du déclenchement de la synchro Firebase après updateStatus: " . $e->getMessage());
        }

        return response()->json($repair);
    }
}
