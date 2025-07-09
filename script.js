// Global variables
let map;
let currentGroup = null;
let groups = {};
let markers = {};
let polygons = {};
let polylines = {};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeMap();
  setupEventListeners();
  createDefaultGroup();
});

// Initialize Leaflet map
function initializeMap() {
  // Initialize map centered on Muscat, Oman
  map = L.map("map").setView([23.588, 58.3829], 7);

  // Base layers
  const osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap contributors",
    }
  );
  const esriSat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles © Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxZoom: 19,
    }
  );

  // Add default layer
  osm.addTo(map);

  // Layer control
  const baseLayers = {
    Map: osm,
    Satellite: esriSat,
  };
  L.control.layers(baseLayers).addTo(map);

  // Add map click handler for coordinate display and marker placement
  map.on("click", function (e) {
    const coords = e.latlng;
    document.getElementById(
      "coordinates"
    ).innerHTML = `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(
      6
    )}`;

    // Ask user if they want to add a marker at this location
    const pointName = prompt(
      "Enter a name for this point (or leave blank for auto-naming):"
    );
    if (pointName !== null) {
      // User didn't cancel
      // Convert lat/lng to approximate easting/northing
      const easting = coords.lng * 1000000; // Simplified reverse conversion
      const northing = coords.lat * 1000000;

      // Set the input values
      document.getElementById("easting").value = easting.toFixed(3);
      document.getElementById("northing").value = northing.toFixed(3);
      document.getElementById("pointName").value = pointName || "";

      // Automatically add the point
      addPoint();
    }
  });

  // Add scale control
  L.control.scale().addTo(map);
}

// Setup event listeners
function setupEventListeners() {
  // Add point button
  document.getElementById("addPoint").addEventListener("click", addPoint);

  // Create group button
  document.getElementById("createGroup").addEventListener("click", createGroup);

  // Clear all button
  document.getElementById("clearAll").addEventListener("click", clearAll);

  // Export data button
  document.getElementById("exportData").addEventListener("click", exportData);

  // Import data button
  document.getElementById("importData").addEventListener("click", importData);

  // Enter key support for inputs
  document.getElementById("easting").addEventListener("keypress", function (e) {
    if (e.key === "Enter") addPoint();
  });

  document
    .getElementById("northing")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") addPoint();
    });

  document
    .getElementById("pointName")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") addPoint();
    });

  document
    .getElementById("groupName")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") createGroup();
    });
}

// Remove default group creation and prompt user to create a group
function createDefaultGroup() {
  // Do nothing: no default group
}

// Add a new point
function addPoint() {
  if (!currentGroup || !groups[currentGroup]) {
    alert("Please create and select a group before adding points.");
    return;
  }
  const easting = parseFloat(document.getElementById("easting").value);
  const northing = parseFloat(document.getElementById("northing").value);
  const pointName =
    document.getElementById("pointName").value ||
    `Point ${Object.keys(markers).length + 1}`;

  if (isNaN(easting) || isNaN(northing)) {
    alert("Please enter valid coordinates");
    return;
  }

  // Convert easting/northing to lat/lng (simplified conversion)
  // In a real application, you'd use a proper coordinate transformation library
  const lat = northing / 1000000; // Simplified conversion
  const lng = easting / 1000000; // Simplified conversion

  const point = {
    id: Date.now(),
    name: pointName,
    easting: easting,
    northing: northing,
    lat: lat,
    lng: lng,
    group: currentGroup,
  };

  // Add to group
  groups[currentGroup].points.push(point);

  // Add marker to map
  addMarkerToMap(point);

  // Update calculations
  updateCalculations();

  // Clear inputs
  document.getElementById("easting").value = "";
  document.getElementById("northing").value = "";
  document.getElementById("pointName").value = "";

  // Update groups list
  updateGroupsList();
}

// Add marker to map
function addMarkerToMap(point) {
  const marker = L.marker([point.lat, point.lng], {
    title: point.name,
  }).addTo(map);

  // Create popup content
  const popupContent = `
        <div style="text-align: center;">
            <h4>${point.name}</h4>
            <p><strong>Easting:</strong> ${point.easting}</p>
            <p><strong>Northing:</strong> ${point.northing}</p>
            <p><strong>Lat:</strong> ${point.lat.toFixed(6)}</p>
            <p><strong>Lng:</strong> ${point.lng.toFixed(6)}</p>
            <button onclick="removePoint('${
              point.id
            }')" style="background: #f56565; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Remove</button>
        </div>
    `;

  marker.bindPopup(popupContent);
  markers[point.id] = marker;

  // Fit map to show all markers
  fitMapToMarkers();
}

// Remove a point
function removePoint(pointId) {
  const point = findPointById(pointId);
  if (!point) return;

  const group = groups[point.group];

  if (confirm(`Are you sure you want to delete the point "${point.name}"?`)) {
    // Remove from group
    group.points = group.points.filter((p) => p.id !== pointId);

    // Remove marker from map
    if (markers[pointId]) {
      map.removeLayer(markers[pointId]);
      delete markers[pointId];
    }

    // Update calculations and groups
    updateCalculations();
    updateGroupsList();
    fitMapToMarkers();

    // Show confirmation
    console.log(`Point "${point.name}" removed from group "${group.name}"`);
  }
}

// Find point by ID
function findPointById(pointId) {
  for (const groupKey in groups) {
    const point = groups[groupKey].points.find((p) => p.id === pointId);
    if (point) return point;
  }
  return null;
}

// Create a new group
function createGroup() {
  const groupName = document.getElementById("groupName").value.trim();
  if (!groupName) {
    alert("Please enter a group name");
    return;
  }

  const groupId = "group_" + Date.now();
  const colors = [
    "#667eea",
    "#48bb78",
    "#ed8936",
    "#f56565",
    "#9f7aea",
    "#38b2ac",
  ];
  const color = colors[Object.keys(groups).length % colors.length];

  groups[groupId] = {
    name: groupName,
    points: [],
    color: color,
  };

  currentGroup = groupId;
  document.getElementById("groupName").value = "";
  updateGroupsList();
}

// Update groups list display
function updateGroupsList() {
  const groupsList = document.getElementById("groupsList");
  groupsList.innerHTML = "";

  const groupKeys = Object.keys(groups);
  if (groupKeys.length === 0) {
    // Show prompt to create a group
    const promptDiv = document.createElement("div");
    promptDiv.className = "no-groups-prompt";
    promptDiv.innerHTML = `<p style='text-align:center; color:#888; margin:20px 0;'>No groups yet.<br><strong>Create a group to get started!</strong></p>`;
    groupsList.appendChild(promptDiv);
    return;
  }

  groupKeys.forEach((groupId) => {
    const group = groups[groupId];
    const groupElement = document.createElement("div");
    groupElement.className = `group-item ${
      groupId === currentGroup ? "active" : ""
    }`;
    groupElement.style.borderLeftColor = group.color;

    // Group header
    const header = document.createElement("div");
    header.className = "group-header";

    // Group info
    const info = document.createElement("div");
    info.className = "group-info";
    const h4 = document.createElement("h4");
    h4.textContent = group.name;
    const p = document.createElement("p");
    p.textContent = `${group.points.length} point${
      group.points.length !== 1 ? "s" : ""
    }`;
    info.appendChild(h4);
    info.appendChild(p);

    // Group actions
    const actions = document.createElement("div");
    actions.className = "group-actions";
    // Select button
    const selectBtn = document.createElement("button");
    selectBtn.className = "group-select-btn";
    selectBtn.title = "Select Group";
    selectBtn.innerHTML = '<span class="select-icon">✓</span>';
    selectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectGroup(groupId);
    });
    // Expand button
    const expandBtn = document.createElement("button");
    expandBtn.className = "group-expand-btn";
    expandBtn.title = "Expand/Collapse";
    expandBtn.innerHTML = '<span class="expand-icon">▼</span>';
    expandBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleGroup(groupId);
    });
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "group-delete-btn";
    deleteBtn.title = "Delete Group";
    deleteBtn.innerHTML = '<span class="delete-icon">🗑️</span>';
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteGroup(groupId);
    });
    actions.appendChild(selectBtn);
    actions.appendChild(expandBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(info);
    header.appendChild(actions);
    header.addEventListener("click", () => toggleGroup(groupId));
    groupElement.appendChild(header);

    // Group content (collapsible)
    const content = document.createElement("div");
    content.className = "group-content";
    content.id = `group-content-${groupId}`;
    content.style.display = "none";

    // Points list
    const pointsList = document.createElement("div");
    pointsList.className = "group-points";
    group.points.forEach((point) => {
      const pointItem = document.createElement("div");
      pointItem.className = "point-item";
      pointItem.addEventListener("click", () => focusPoint(point.id));
      // Point info
      const pointInfo = document.createElement("div");
      pointInfo.className = "point-info";
      const strong = document.createElement("strong");
      strong.textContent = point.name;
      const coords = document.createElement("span");
      coords.className = "point-coords";
      coords.textContent = `E: ${point.easting}, N: ${point.northing}`;
      pointInfo.appendChild(strong);
      pointInfo.appendChild(coords);
      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-point-btn";
      removeBtn.title = "Remove Point";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removePoint(point.id);
      });
      pointItem.appendChild(pointInfo);
      pointItem.appendChild(removeBtn);
      pointsList.appendChild(pointItem);
    });
    content.appendChild(pointsList);

    // Calculations (area/perimeter)
    if (group.points.length >= 3) {
      const calcs = document.createElement("div");
      calcs.className = "group-calculations";
      const areaDiv = document.createElement("div");
      areaDiv.className = "calculation-summary";
      areaDiv.innerHTML = `<strong>Area:</strong> ${calculatePolygonArea(
        group.points.map((p) => [p.lat, p.lng])
      ).toFixed(2)} m²`;
      const periDiv = document.createElement("div");
      periDiv.className = "calculation-summary";
      periDiv.innerHTML = `<strong>Perimeter:</strong> ${calculatePerimeter(
        group.points.map((p) => [p.lat, p.lng])
      ).toFixed(2)} m`;
      calcs.appendChild(areaDiv);
      calcs.appendChild(periDiv);
      content.appendChild(calcs);
    }

    groupElement.appendChild(content);
    groupsList.appendChild(groupElement);
  });
}

// Toggle group expansion
function toggleGroup(groupId) {
  const content = document.getElementById(`group-content-${groupId}`);
  const expandIcon = document
    .querySelector(`#group-content-${groupId}`)
    .previousElementSibling.querySelector(".expand-icon");

  if (content.style.display === "none") {
    content.style.display = "block";
    expandIcon.textContent = "▲";
  } else {
    content.style.display = "none";
    expandIcon.textContent = "▼";
  }
}

// Select a group
function selectGroup(groupId) {
  currentGroup = groupId;
  updateGroupsList();
}

// Focus on a specific point (center map on it)
function focusPoint(pointId) {
  const point = findPointById(pointId);
  if (point && markers[pointId]) {
    map.setView([point.lat, point.lng], 16);
    markers[pointId].openPopup();
  }
}

// Delete a group and all its points
function deleteGroup(groupId) {
  const group = groups[groupId];
  if (!group) return;

  const groupName = group.name;
  const pointCount = group.points.length;

  if (
    confirm(
      `Are you sure you want to delete the group "${groupName}" with ${pointCount} point${
        pointCount !== 1 ? "s" : ""
      }?`
    )
  ) {
    // Remove all markers for this group
    group.points.forEach((point) => {
      if (markers[point.id]) {
        map.removeLayer(markers[point.id]);
        delete markers[point.id];
      }
    });

    // Remove polygon for this group
    if (polygons[groupId]) {
      map.removeLayer(polygons[groupId]);
      delete polygons[groupId];
    }

    // Remove polyline for this group
    if (polylines[groupId]) {
      map.removeLayer(polylines[groupId]);
      delete polylines[groupId];
    }

    // Remove the group
    delete groups[groupId];

    // If this was the current group, select the first available group
    if (currentGroup === groupId) {
      const remainingGroups = Object.keys(groups);
      currentGroup = remainingGroups.length > 0 ? remainingGroups[0] : null;
    }

    // Update calculations and groups list
    updateCalculations();
    updateGroupsList();
    fitMapToMarkers();

    console.log(`Group "${groupName}" with ${pointCount} points deleted`);
  }
}

// Delete all groups
function deleteAllGroups() {
  const groupCount = Object.keys(groups).length;
  const totalPoints = Object.values(groups).reduce(
    (sum, group) => sum + group.points.length,
    0
  );

  if (
    confirm(
      `Are you sure you want to delete all ${groupCount} groups with ${totalPoints} total points?`
    )
  ) {
    // Remove all markers
    Object.values(markers).forEach((marker) => {
      map.removeLayer(marker);
    });
    markers = {};

    // Remove all polygons
    Object.values(polygons).forEach((polygon) => {
      map.removeLayer(polygon);
    });
    polygons = {};

    // Remove all polylines
    Object.values(polylines).forEach((polyline) => {
      map.removeLayer(polyline);
    });
    polylines = {};

    // Clear all groups
    groups = {};
    currentGroup = null;

    // Create default group
    createDefaultGroup();

    // Clear calculations
    updateCalculations();
    updateGroupsList();

    console.log(`All ${groupCount} groups with ${totalPoints} points deleted`);
  }
}

// Switch between calculation tabs
function switchTab(tabName) {
  // Remove active class from all tabs and content
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Add active class to selected tab and content
  document
    .querySelector(`[onclick="switchTab('${tabName}')"]`)
    .classList.add("active");
  document
    .getElementById(
      tabName === "distances"
        ? "distanceResults"
        : tabName === "areas"
        ? "areaResults"
        : "summaryResults"
    )
    .classList.add("active");

  // Update summary if switching to summary tab
  if (tabName === "summary") {
    updateSummaryCalculations();
  }
}

// Update summary calculations
function updateSummaryCalculations() {
  const summaryResults = document.getElementById("summaryResults");
  summaryResults.innerHTML = "";

  let totalPoints = 0;
  let totalDistance = 0;
  let totalArea = 0;
  let totalPerimeter = 0;
  let groupsWithAreas = 0;

  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    totalPoints += group.points.length;

    // Calculate total distance
    for (let i = 0; i < group.points.length - 1; i++) {
      totalDistance += calculateDistance(group.points[i], group.points[i + 1]);
    }

    // Calculate area if 3+ points
    if (group.points.length >= 3) {
      const coordinates = group.points.map((point) => [point.lat, point.lng]);
      totalArea += calculatePolygonArea(coordinates);
      totalPerimeter += calculatePerimeter(coordinates);
      groupsWithAreas++;
    }
  });

  const summaryElement = document.createElement("div");
  summaryElement.className = "calculation-item summary";
  summaryElement.innerHTML = `
    <h4>Project Summary</h4>
    <div class="summary-stats">
      <div class="summary-stat">
        <span class="summary-stat-value">${Object.keys(groups).length}</span>
        <span class="summary-stat-label">Groups</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${totalPoints}</span>
        <span class="summary-stat-label">Total Points</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${totalDistance.toFixed(2)}</span>
        <span class="summary-stat-label">Total Distance (m)</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${totalArea.toFixed(2)}</span>
        <span class="summary-stat-label">Total Area (m²)</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${groupsWithAreas}</span>
        <span class="summary-stat-label">Areas Calculated</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${totalPerimeter.toFixed(2)}</span>
        <span class="summary-stat-label">Total Perimeter (m)</span>
      </div>
    </div>
  `;

  summaryResults.appendChild(summaryElement);
}

// Update calculations
function updateCalculations() {
  updateDistanceCalculations();
  updateAreaCalculations();
}

// Update distance calculations
function updateDistanceCalculations() {
  const distanceResults = document.getElementById("distanceResults");
  distanceResults.innerHTML = "";

  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    if (group.points.length < 2) return;

    // Create group container
    const groupElement = document.createElement("div");
    groupElement.className = "calculation-group";
    groupElement.innerHTML = `<h5>${group.name}</h5>`;

    let totalDistance = 0;

    // Calculate distances between consecutive points
    for (let i = 0; i < group.points.length - 1; i++) {
      const point1 = group.points[i];
      const point2 = group.points[i + 1];
      const distance = calculateDistance(point1, point2);
      totalDistance += distance;

      const distanceElement = document.createElement("div");
      distanceElement.className = "calculation-item";
      distanceElement.innerHTML = `
        <h4>${point1.name} to ${point2.name}</h4>
        <div class="calculation-details">
          <span class="calculation-value">${distance.toFixed(2)}</span>
          <span class="calculation-unit">meters</span>
        </div>
      `;

      groupElement.appendChild(distanceElement);
    }

    // Add total distance
    if (group.points.length > 2) {
      const totalElement = document.createElement("div");
      totalElement.className = "calculation-item summary";
      totalElement.innerHTML = `
        <h4>Total Distance</h4>
        <div class="calculation-details">
          <span class="calculation-value">${totalDistance.toFixed(2)}</span>
          <span class="calculation-unit">meters</span>
        </div>
      `;
      groupElement.appendChild(totalElement);
    }

    distanceResults.appendChild(groupElement);
  });
}

// Update area calculations
function updateAreaCalculations() {
  const areaResults = document.getElementById("areaResults");
  areaResults.innerHTML = "";

  // Clear existing polygons and polylines
  Object.keys(polygons).forEach((key) => {
    map.removeLayer(polygons[key]);
  });
  Object.keys(polylines).forEach((key) => {
    map.removeLayer(polylines[key]);
  });
  polygons = {};
  polylines = {};

  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    if (group.points.length < 3) return;

    // Create polygon coordinates
    const coordinates = group.points.map((point) => [point.lat, point.lng]);

    // Draw polygon
    const polygon = L.polygon(coordinates, {
      color: group.color,
      fillColor: group.color,
      fillOpacity: 0.3,
      weight: 2,
    }).addTo(map);

    // Calculate area
    const area = calculatePolygonArea(coordinates);

    // Add popup to polygon
    polygon.bindPopup(`
            <div style="text-align: center;">
                <h4>${group.name}</h4>
                <p><strong>Area:</strong> ${area.toFixed(2)} square meters</p>
                <p><strong>Perimeter:</strong> ${calculatePerimeter(
                  coordinates
                ).toFixed(2)} meters</p>
            </div>
        `);

    polygons[groupId] = polygon;

    // Create area result element
    const areaElement = document.createElement("div");
    areaElement.className = "calculation-item area";
    areaElement.innerHTML = `
      <h4>${group.name}</h4>
      <div class="calculation-details">
        <div>
          <span class="calculation-value">${area.toFixed(2)}</span>
          <span class="calculation-unit">m²</span>
        </div>
        <div>
          <span class="calculation-value">${calculatePerimeter(
            coordinates
          ).toFixed(2)}</span>
          <span class="calculation-unit">m perimeter</span>
        </div>
      </div>
    `;

    areaResults.appendChild(areaElement);
  });

  // Draw polylines for groups with 2 points
  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    if (group.points.length === 2) {
      const coordinates = group.points.map((point) => [point.lat, point.lng]);
      const polyline = L.polyline(coordinates, {
        color: group.color,
        weight: 3,
      }).addTo(map);

      polylines[groupId] = polyline;
    }
  });
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate polygon area using shoelace formula
function calculatePolygonArea(coordinates) {
  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][1] * coordinates[j][0];
    area -= coordinates[j][1] * coordinates[i][0];
  }

  area = Math.abs(area) / 2;

  // Convert to square meters (approximate)
  return area * 111320 * 111320; // Rough conversion
}

// Calculate polygon perimeter
function calculatePerimeter(coordinates) {
  let perimeter = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = coordinates[i][0];
    const lng1 = coordinates[i][1];
    const lat2 = coordinates[j][0];
    const lng2 = coordinates[j][1];

    perimeter += calculateDistance(
      { lat: lat1, lng: lng1 },
      { lat: lat2, lng: lng2 }
    );
  }

  return perimeter;
}

// Fit map to show all markers
function fitMapToMarkers() {
  const markerLayers = Object.values(markers);
  if (markerLayers.length > 0) {
    const group = L.featureGroup(markerLayers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Clear all data
function clearAll() {
  if (confirm("Are you sure you want to clear all data?")) {
    // Clear markers
    Object.values(markers).forEach((marker) => {
      map.removeLayer(marker);
    });
    markers = {};

    // Clear polygons
    Object.values(polygons).forEach((polygon) => {
      map.removeLayer(polygon);
    });
    polygons = {};

    // Clear polylines
    Object.values(polylines).forEach((polyline) => {
      map.removeLayer(polyline);
    });
    polylines = {};

    // Clear groups
    groups = {};
    currentGroup = null;

    // Create default group
    createDefaultGroup();

    // Clear calculations
    document.getElementById("distanceResults").innerHTML = "";
    document.getElementById("areaResults").innerHTML = "";
  }
}

// Export data
function exportData() {
  const data = {
    groups: groups,
    exportDate: new Date().toISOString(),
  };

  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = `coordinate_data_${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
}

// Import data
function importData() {
  const fileInput = document.getElementById("fileInput");
  fileInput.click();

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        if (data.groups) {
          // Clear existing data
          clearAllData();

          // Import groups
          groups = data.groups;

          // Recreate markers and polygons
          Object.keys(groups).forEach((groupId) => {
            const group = groups[groupId];
            group.points.forEach((point) => {
              addMarkerToMap(point);
            });
          });

          // Update calculations and groups list
          updateCalculations();
          updateGroupsList();
          fitMapToMarkers();

          // Set current group to first available
          const groupKeys = Object.keys(groups);
          if (groupKeys.length > 0) {
            currentGroup = groupKeys[0];
            updateGroupsList();
          }

          alert(
            `Successfully imported ${Object.keys(groups).length} groups with ${
              Object.keys(markers).length
            } total points!`
          );
        } else {
          alert("Invalid file format. Please select a valid export file.");
        }
      } catch (error) {
        alert("Error reading file. Please make sure it's a valid JSON file.");
        console.error("Import error:", error);
      }
    };

    reader.readAsText(file);
  });
}

// Clear all data without confirmation (for import)
function clearAllData() {
  // Clear markers
  Object.values(markers).forEach((marker) => {
    map.removeLayer(marker);
  });
  markers = {};

  // Clear polygons
  Object.values(polygons).forEach((polygon) => {
    map.removeLayer(polygon);
  });
  polygons = {};

  // Clear polylines
  Object.values(polylines).forEach((polyline) => {
    map.removeLayer(polyline);
  });
  polylines = {};

  // Clear groups
  groups = {};
  currentGroup = null;

  // Clear calculations
  document.getElementById("distanceResults").innerHTML = "";
  document.getElementById("areaResults").innerHTML = "";
}
