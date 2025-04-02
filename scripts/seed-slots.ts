import { db } from "../server/db";
import { availableSlots } from "../shared/schema";

// Seed only the next 7 days for the demo
async function seedAvailableSlots() {
  console.log("Seeding available slots...");
  
  // Get dates for the next 7 days
  const startDate = new Date();
  const slotsToInsert: { date: Date; isEnabled: boolean }[] = [];
  
  // Create slots for the next 7 days only
  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setDate(startDate.getDate() + day);
    
    // Skip Tuesdays (2) and Saturdays (6)
    if (date.getDay() === 2 || date.getDay() === 6) {
      continue;
    }
    
    // Morning slots: 9 AM, 10 AM, 11 AM, 12 PM (fewer for the demo)
    for (let hour = 9; hour < 13; hour++) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);
      
      slotsToInsert.push({
        date: slotTime,
        isEnabled: true
      });
    }
    
    // Afternoon slots: 3 PM, 4 PM
    for (let hour = 15; hour < 17; hour++) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);
      
      slotsToInsert.push({
        date: slotTime,
        isEnabled: true
      });
    }
  }
  
  // Batch insert
  try {
    if (slotsToInsert.length > 0) {
      await db.insert(availableSlots)
        .values(slotsToInsert)
        .onConflictDoNothing();
      
      console.log(`Created or updated ${slotsToInsert.length} available slots`);
    } else {
      console.log("No slots to insert");
    }
  } catch (error) {
    console.error("Error creating slots:", error);
  }
}

// Run the seeding function
seedAvailableSlots()
  .then(() => {
    console.log("Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });