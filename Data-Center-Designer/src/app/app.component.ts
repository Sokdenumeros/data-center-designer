import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import * as Papa from 'papaparse';  // Import PapaParse

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Data-Center-Designer';
  uniqueIds: string[] = [];  // Store unique IDs

  // Handle the file input event and parse the CSV
  onFileSelected(event: any) {
    const file: File = event.target.files[0];  // Get the selected file

    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          this.processCSV(result.data);  // Parse and process the data
        },
        header: true,  // Treat the first row as header
      });
    }
  }

  // Process the CSV data
  processCSV(data: any[]) {
    const ids: Set<string> = new Set();  // To store unique IDs

    // Loop through the rows and collect unique IDs
    data.forEach(row => {
      if (row.ID) {
        ids.add(row.ID);  // Add ID to the Set
      }
    });

    // Convert the Set to an array
    this.uniqueIds = Array.from(ids);
  }

  // Handle button click event (for demonstration)
  onButtonClick(id: string) {
    console.log('Button clicked for ID:', id);
  }
}
