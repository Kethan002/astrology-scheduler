import { db } from "../server/db";
import { availableSlots } from "../shared/schema";

async function seedOneSlot() {
  console.log("Seeding a single test slot...");
  
  // Create a slot for tomorrow at 9 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  try {
    const result = await db.insert(availableSlots).values({
      date: tomorrow,
      isEnabled: true
    });
    
    console.log("Created test slot for tomorrow at 9 AM");
    console.log("Seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating slot:", error);
    process.exit(1);
  }
}

seedOneSlot();