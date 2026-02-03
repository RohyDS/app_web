<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Intervention;

class InterventionSeeder extends Seeder
{
    public function run(): void
    {
        $interventions = [
            ['name' => 'Frein', 'price' => 250000, 'duration' => 600],
            ['name' => 'Vidange', 'price' => 200000, 'duration' => 900],
            ['name' => 'Filtre', 'price' => 100000, 'duration' => 300],
            ['name' => 'Batterie', 'price' => 500000, 'duration' => 450],
            ['name' => 'Amortisseurs', 'price' => 750000, 'duration' => 1200],
            ['name' => 'Embrayage', 'price' => 1500000, 'duration' => 3600],
            ['name' => 'Pneus', 'price' => 400000, 'duration' => 600],
            ['name' => 'Système de refroidissement', 'price' => 600000, 'duration' => 1800],
        ];

        foreach ($interventions as $intervention) {
            Intervention::updateOrCreate(['name' => $intervention['name']], $intervention);
        }
    }
}
