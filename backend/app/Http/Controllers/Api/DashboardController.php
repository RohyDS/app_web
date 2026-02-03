<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Intervention;
use App\Models\Repair;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function statistics()
    {
        $totalRevenue = Repair::where('status', 'paid')->sum('total_amount');
        $totalClients = User::count();
        $activeRepairs = Repair::whereIn('status', ['pending', 'in_progress', 'completed', 'waiting_for_payment'])->count();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_clients' => $totalClients,
            'active_repairs' => $activeRepairs
        ]);
    }

    public function activeRepairs()
    {
        $repairs = Repair::with(['car.user', 'items.intervention'])
            ->whereIn('status', ['pending', 'in_progress', 'completed', 'waiting_for_payment'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($repairs);
    }

    public function interventions()
    {
        return response()->json(Intervention::all());
    }

    public function updateIntervention(Request $request, Intervention $intervention)
    {
        $validated = $request->validate([
            'price' => 'required|numeric|min:0',
            'duration' => 'required|integer|min:0',
        ]);

        $intervention->update($validated);

        return response()->json($intervention);
    }
}
