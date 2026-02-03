<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CarController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        // For now, return all cars as we don't have authentication yet
        return response()->json(Car::all());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'model' => 'required|string',
            'license_plate' => 'required|string|unique:cars',
            'description' => 'nullable|string',
            'user_id' => 'required|exists:users,id',
        ]);

        $car = Car::create($validated);

        return response()->json($car, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Car $car): JsonResponse
    {
        return response()->json($car->load('repairs.items.intervention'));
    }
}
