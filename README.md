# CCB ride app

## SQL files
located in supabase/migrations , and is time tagged. Each change will be in a later file and will be read sequentially.
to generate the migration file, run:
`npx supabase migration new initial_schema`
Then paste your SQL changes into that file.

## Introduction
CCBride's objective is to match available riders with drivers so that riders can be brought to church.

### Create Account
Users can either register as a rider or a driver.
Enter an email and a password to create a profile within CCBride. 
The developers cannot see your email nor password. The purpose of both is purely to create a unique profile you can log back into, with a consistent name.
I reccomend you save this email and password in the browser.

### Usage (Riders)
Riders can request a ride with preferred time and location of pickup.
The format of both is TEXT type, and is up to the riders and drivers to understand whatever is typed into the time and location boxes.
Once a request is sent, it will be in the PENDING status and can be cancelled by the rider. One request per rider can be active at any time.
When accepted, riders can see other passengers and details of the accepted ride. 
Riders may be kicked out, and pickup times are at the mercy of the Driver and may be changed by the driver at any time.

### Usage (Drivers)
Drivers may create ride parties (groups), with specified pickup time range and seat capacity (seat capacity calculation in the DB).
Drivers may accept Rider pickup requests, and can see their current roster of accepted Riders. Drivers may modify pickup times too.
NOTE: I encourage pickup time communication on whatsapp.
Drivers may toggle the party status between 'open' and 'close', which modifies the visibility of the party to other Riders. 
'Finished' will immediately terminate the ride and kick out all Riders. Only press this button when the ride has concluded. The Database will clear the party record (and cascade to the request records as well) after 168 hours of the ride date regardless if 'Finished' was pressed. The riders' screens will also reset to the beginning state of pickup request creation.
