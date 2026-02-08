<?php

use App\Http\Controllers\Api\FirebaseSyncController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\InterventionController;
use App\Http\Controllers\Api\RepairController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\PaymentController;
use Illuminate\Support\Facades\Route;

// Stats
Route::get('/stats', [StatsController::class, 'index']);

// Interventions
Route::apiResource('interventions', InterventionController::class);

// Cars
Route::apiResource('cars', CarController::class);

// Repairs
Route::apiResource('repairs', RepairController::class);
Route::patch('repairs/{repair}/status', [RepairController::class, 'updateStatus']);

// Payments
Route::get('/payments', [PaymentController::class, 'index']);
Route::post('/payments', [PaymentController::class, 'store']);

// Firebase Sync
Route::post('/sync-firebase', [FirebaseSyncController::class, 'sync']);
