<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Intervention;
use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;

class InterventionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(Intervention::orderBy('name')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'duration' => 'required|integer|min:1', // Duration in seconds as per request
        ]);

        $intervention = Intervention::create($validated);

        return response()->json($intervention, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Intervention $intervention): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'duration' => 'required|integer|min:1',
        ]);

        $intervention->update($validated);

        return response()->json($intervention);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Intervention $intervention): JsonResponse
    {
        $intervention->delete();

        return response()->json(null, 204);
    }
}
