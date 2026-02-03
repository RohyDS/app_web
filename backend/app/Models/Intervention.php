<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Intervention extends Model
{
    protected $fillable = ['name', 'price', 'duration'];

    public function repairItems(): HasMany
    {
        return $this->hasMany(RepairItem::class);
    }
}
