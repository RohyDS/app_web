<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Payment extends Model
{
    protected $fillable = [
        'firebase_id',
        'repair_id',
        'amount',
        'payment_method',
        'transaction_id',
        'status'
    ];

    public function repair(): BelongsTo
    {
        return $this->belongsTo(Repair::class);
    }

    public function details(): HasOne
    {
        return $this->hasOne(PaymentDetail::class);
    }
}
