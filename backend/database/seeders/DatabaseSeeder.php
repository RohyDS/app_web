<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            InterventionSeeder::class,
        ]);

        // Create some users (clients)
        $users = User::factory(10)->create();

        // Create some cars and repairs for the dashboard
        foreach ($users as $user) {
            $car = \App\Models\Car::create([
                'user_id' => $user->id,
                'model' => 'Model ' . fake()->word(),
                'license_plate' => fake()->bothify('??-###-??'),
            ]);

            $repair = \App\Models\Repair::create([
                'car_id' => $car->id,
                'status' => fake()->randomElement(['pending', 'in_progress', 'completed', 'paid']),
                'total_amount' => 0,
            ]);

            // Add some items to repair
            $interventions = \App\Models\Intervention::inRandomOrder()->take(2)->get();
            $total = 0;
            foreach ($interventions as $intervention) {
                \App\Models\RepairItem::create([
                    'repair_id' => $repair->id,
                    'intervention_id' => $intervention->id,
                    'price' => $intervention->price,
                    'remaining_time' => $intervention->duration,
                ]);
                $total += $intervention->price;
            }
            $repair->update(['total_amount' => $total]);
        }
    }
}
