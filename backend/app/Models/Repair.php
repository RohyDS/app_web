<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Repair extends Model
{
    protected $fillable = [
        'car_id', 
        'status', 
        'slot_number', 
        'started_at', 
        'completed_at', 
        'total_amount'
    ];

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RepairItem::class);
    }
}
