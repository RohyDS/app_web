<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('repair_id')->constrained()->onDelete('cascade');
            $table->foreignId('intervention_id')->constrained()->onDelete('cascade');
            $table->decimal('price', 12, 2);
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->integer('remaining_time'); // en secondes
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_items');
    }
};
