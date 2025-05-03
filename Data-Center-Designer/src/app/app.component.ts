import { Component } from '@angular/core';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as Papa from 'papaparse';  // Import PapaParse

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
    title = 'Data-Center-Designer';
  rawData: any[] = [];
  uniqueIds: string[] = [];
  droppedItems: string[] = [];

onDragStart(event: DragEvent, id: string) {
  event.dataTransfer?.setData('text/plain', id);
}

onDragOver(event: DragEvent) {
  event.preventDefault(); // Needed to allow drop
}

onDrop(event: DragEvent) {
  event.preventDefault();
  const id = event.dataTransfer?.getData('text/plain');
  if (id) {
    this.droppedItems.push(id);
  }
}


  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        this.parseCSV(text);
      };
      reader.readAsText(file);
    }
  }

  parseCSV(data: string) {
    const lines = data.trim().split('\n');
    const headers = lines[0].split('\t');
    this.rawData = lines.slice(1).map(line => {
      const values = line.split('\t');
      return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i].trim()]));
    });

    this.uniqueIds = [...new Set(this.rawData.map(item => item.ID))];
  }

  onButtonClick(id: string) {
    console.log('Clicked:', id);
  }
}
