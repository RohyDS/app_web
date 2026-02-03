<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Repair;
use App\Models\RepairItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * Get dashboard statistics.
     */
    public function index(): JsonResponse
    {
        $totalRevenue = Repair::where('status', 'paid')->sum('total_amount');
        $repairsCount = Repair::count();
        $pendingRepairs = Repair::where('status', 'pending')->count();
        $totalClients = \App\Models\User::count();
        
        // Count interventions by type
        $interventionsByType = DB::table('repair_items')
            ->join('interventions', 'repair_items.intervention_id', '=', 'interventions.id')
            ->select('interventions.name', DB::raw('count(*) as total'))
            ->groupBy('interventions.name')
            ->get();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_repairs' => $repairsCount,
            'pending_repairs' => $pendingRepairs,
            'total_clients' => $totalClients,
            'interventions_by_type' => $interventionsByType,
        ]);
    }
}
