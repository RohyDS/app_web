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
        $totalRevenue = \App\Models\Payment::sum('amount');
        $totalClients = User::count();
        $activeRepairs = Repair::whereIn('status', ['pending', 'in_progress', 'completed', 'waiting_for_payment'])->count();
        $totalRepairs = Repair::count();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_clients' => $totalClients,
            'active_repairs' => $activeRepairs,
            'total_repairs' => $totalRepairs
        ]);
    }

    public function activeRepairs()
    {
        $repairs = Repair::with(['car.user', 'items.intervention'])
            ->withSum('payments', 'amount')
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
