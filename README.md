# 🌍 Leaflet Coordinate Calculator

A modern web application for entering coordinates (easting and northing), calculating distances between points, and drawing areas with multiple groups.

## Features

### 📍 Coordinate Management

- Enter easting and northing coordinates
- Add optional point names for better organization
- Support for multiple coordinate systems
- Real-time coordinate display on map click

### 📏 Distance Calculations

- Calculate distances between consecutive points
- Automatic distance updates when points are added/removed
- Results displayed in meters with high precision

### 🎯 Area Calculations

- Draw polygons for 3 or more points
- Calculate area in square meters
- Calculate perimeter in meters
- Support for complex shapes

### 👥 Group Management

- Create multiple groups for different areas
- Color-coded groups for easy identification
- Switch between groups to manage different projects
- Export/import group data

### 🗺️ Interactive Map

- Leaflet-based interactive map
- Click to get coordinates
- Automatic map fitting to show all points
- Popup information for each point

## How to Use

### Getting Started

1. Open `index.html` in a web browser
2. The application will load with a default group
3. Start adding coordinates using the input form

### Adding Points

**Method 1: Manual Input**

1. Enter the **Easting** coordinate
2. Enter the **Northing** coordinate
3. (Optional) Add a point name
4. Click "Add Point" or press Enter
5. The point will appear on the map with a marker

**Method 2: Map Click**

1. Click anywhere on the map
2. Enter a name for the point (or leave blank for auto-naming)
3. The coordinates will be automatically converted and the point added

### Creating Groups

1. Enter a group name in the "Group Name" field
2. Click "Create Group" or press Enter
3. The new group will appear in the groups list
4. Click on a group to make it active

### Viewing Calculations

- **Distances**: Automatically calculated between consecutive points
- **Areas**: Calculated for groups with 3 or more points
- **Perimeter**: Calculated for polygon areas

### Managing Data

- **Clear All**: Removes all points and groups
- **Export Data**: Downloads all data as JSON file
- **Import Data**: Upload previously exported JSON files
- **Remove Points**: Click the "Remove" button in point popups

### Import/Export Functionality

**Exporting Data:**

1. Click "Export Data" button
2. JSON file downloads automatically
3. File contains all groups, points, and calculations

**Importing Data:**

1. Click "Import Data" button
2. Select a previously exported JSON file
3. All data is restored including groups, points, and calculations
4. Map automatically updates to show imported data

## File Structure

```
leaflet-map-cords-easting-and-northing/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Technical Details

### Coordinate System

- Uses simplified conversion from easting/northing to lat/lng
- For production use, implement proper coordinate transformation
- Supports various coordinate systems

### Calculations

- **Distance**: Uses Haversine formula for accurate spherical calculations
- **Area**: Uses shoelace formula for polygon area calculation
- **Perimeter**: Calculated as sum of distances between consecutive points

### Browser Compatibility

- Modern browsers with ES6 support
- Responsive design for mobile devices
- No external dependencies except Leaflet

## Interactive Features

The application now supports:

- **Map Click to Add Points**: Click anywhere on the map to add markers
- **Automatic Coordinate Conversion**: Converts map coordinates to easting/northing
- **Real-time Coordinate Display**: Shows coordinates when clicking on the map
- **No Default Data**: Start with a clean slate for your own coordinates

## Customization

### Colors

- Modify the color array in `script.js` to change group colors
- Update CSS variables for consistent theming

### Map Settings

- Change default map center in `initializeMap()`
- Modify tile layer for different map styles
- Adjust zoom levels and controls

### Coordinate Conversion

- Replace the simplified conversion in `addPoint()` with proper transformation
- Consider using libraries like Proj4js for accurate coordinate systems

## Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (limited support)

## Performance

- Optimized for large numbers of points
- Efficient polygon rendering
- Responsive UI updates
- Memory management for markers and polygons

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests!

---

**Note**: This application uses a simplified coordinate conversion. For precise surveying or mapping applications, implement proper coordinate transformation libraries.
