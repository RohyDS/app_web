<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Repair;
use App\Models\RepairItem;
use App\Models\Intervention;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RepairController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(Repair::with(['car', 'items.intervention'])->get());
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
    public function updateStatus(Request $request, Repair $repair): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,completed,waiting_for_payment,paid',
            'slot_number' => 'nullable|integer|in:1,2',
        ]);

        if ($validated['status'] === 'in_progress' && !$repair->started_at) {
            $repair->started_at = now();
        }

        if ($validated['status'] === 'completed' && !$repair->completed_at) {
            $repair->completed_at = now();
        }

        $repair->update($validated);

        return response()->json($repair);
    }
}
