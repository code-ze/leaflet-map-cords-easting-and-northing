// Global variables
let map;
let currentGroup = null;
let groups = {};
let markers = {};
let polylines = {};
let distanceLabels = {};

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

    // Always use UTM 40N (zone 40)
    const zone = 40;
    const [psdLat, psdLon] = window.coordSys.wgs84ToPSD93(
      coords.lat,
      coords.lng
    );
    const utm = window.coordSys.psd93ToUTM(psdLat, psdLon, zone);
    document.getElementById("easting").value = utm.easting
      ? utm.easting.toFixed(3)
      : "";
    document.getElementById("northing").value = utm.northing
      ? utm.northing.toFixed(3)
      : "";
    document.getElementById("pointName").value = "";
    const pointName = prompt(
      "Enter a name for this point (or leave blank for auto-naming):"
    );
    if (pointName !== null) {
      document.getElementById("pointName").value = pointName || "";
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

// Get selected coordinate system
function getSelectedCoordSystem() {
  return document.getElementById("coordSystem").value;
}

// Add a new point
function addPoint() {
  if (!currentGroup || !groups[currentGroup]) {
    alert("Please create and select a group before adding points.");
    return;
  }
  // Always use UTM 40N (zone 40)
  const easting = parseFloat(document.getElementById("easting").value);
  const northing = parseFloat(document.getElementById("northing").value);
  const pointName =
    document.getElementById("pointName").value ||
    `Point ${Object.keys(markers).length + 1}`;

  if (isNaN(easting) || isNaN(northing)) {
    alert("Please enter valid coordinates");
    return;
  }

  const zone = 40;
  const { lat: psdLat, lon: psdLon } = window.coordSys.utmToPSD93(
    easting,
    northing,
    zone
  );
  const [lat, lng] = window.coordSys.psd93ToWGS84(psdLat, psdLon);

  const point = {
    id: Date.now(),
    name: pointName,
    easting: easting,
    northing: northing,
    lat: lat,
    lng: lng,
    group: currentGroup,
    coordSystem: "utm40",
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
  // Convert string to number if needed
  const numericPointId = parseInt(pointId);
  const point = findPointById(numericPointId);
  if (!point) return;

  const group = groups[point.group];

  if (confirm(`Are you sure you want to delete the point "${point.name}"?`)) {
    // Remove from group
    group.points = group.points.filter((p) => p.id !== numericPointId);

    // Remove marker from map
    if (markers[numericPointId]) {
      map.removeLayer(markers[numericPointId]);
      delete markers[numericPointId];
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

    // Distance calculations
    if (group.points.length >= 2) {
      const calcs = document.createElement("div");
      calcs.className = "group-calculations";
      let totalDistance = 0;
      
      for (let i = 0; i < group.points.length - 1; i++) {
        totalDistance += calculateDistance(group.points[i], group.points[i + 1]);
      }
      
      const distanceDiv = document.createElement("div");
      distanceDiv.className = "calculation-summary";
      distanceDiv.innerHTML = `<strong>Total Distance:</strong> ${totalDistance.toFixed(2)} m`;
      calcs.appendChild(distanceDiv);
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

    // Remove polylines for this group
    if (polylines[groupId]) {
      map.removeLayer(polylines[groupId]);
      delete polylines[groupId];
    }

    // Remove distance labels for this group
    if (distanceLabels[groupId]) {
      distanceLabels[groupId].forEach(label => {
        map.removeLayer(label);
      });
      delete distanceLabels[groupId];
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
        : tabName === "summary"
        ? "summaryResults"
        : "distanceResults"
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
  let groupsWithDistances = 0;

  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    totalPoints += group.points.length;

    // Calculate total distance
    for (let i = 0; i < group.points.length - 1; i++) {
      totalDistance += calculateDistance(group.points[i], group.points[i + 1]);
    }

    if (group.points.length >= 2) {
      groupsWithDistances++;
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
        <span class="summary-stat-value">${groupsWithDistances}</span>
        <span class="summary-stat-label">Groups with Distances</span>
      </div>
    </div>
  `;

  summaryResults.appendChild(summaryElement);
}

// Update calculations
function updateCalculations() {
  updateDistanceCalculations();
  updateMapDistances();
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

// Update map distances - draw polylines and add distance labels
function updateMapDistances() {
  // Clear existing polylines and distance labels
  Object.keys(polylines).forEach((key) => {
    map.removeLayer(polylines[key]);
  });
  Object.keys(distanceLabels).forEach((key) => {
    distanceLabels[key].forEach(label => {
      map.removeLayer(label);
    });
  });
  polylines = {};
  distanceLabels = {};

  Object.keys(groups).forEach((groupId) => {
    const group = groups[groupId];
    if (group.points.length < 2) return;

    const coordinates = group.points.map((point) => [point.lat, point.lng]);
    
    // Draw polyline
    const polyline = L.polyline(coordinates, {
      color: group.color,
      weight: 3,
      opacity: 0.8,
    }).addTo(map);

    polylines[groupId] = polyline;

    // Add distance labels on the map
    const labels = [];
    for (let i = 0; i < group.points.length - 1; i++) {
      const point1 = group.points[i];
      const point2 = group.points[i + 1];
      const distance = calculateDistance(point1, point2);
      
      // Calculate midpoint for label placement
      const midLat = (point1.lat + point2.lat) / 2;
      const midLng = (point1.lng + point2.lng) / 2;
      
      // Create custom icon for distance label
      const distanceIcon = L.divIcon({
        className: 'distance-label',
        html: `<div style="background: white; border: 2px solid ${group.color}; color: ${group.color}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 12px; white-space: nowrap;">${distance.toFixed(1)}m</div>`,
        iconSize: [100, 20],
        iconAnchor: [50, 10]
      });
      
      const label = L.marker([midLat, midLng], {
        icon: distanceIcon,
        interactive: false
      }).addTo(map);
      
      labels.push(label);
    }
    
    distanceLabels[groupId] = labels;
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

    // Clear polylines
    Object.values(polylines).forEach((polyline) => {
      map.removeLayer(polyline);
    });
    polylines = {};

    // Clear distance labels
    Object.keys(distanceLabels).forEach((key) => {
      distanceLabels[key].forEach(label => {
        map.removeLayer(label);
      });
    });
    distanceLabels = {};

    // Clear groups
    groups = {};
    currentGroup = null;

    // Create default group
    createDefaultGroup();

    // Clear calculations
    document.getElementById("distanceResults").innerHTML = "";
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

          // Recreate markers and polylines
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

  // Clear polylines
  Object.values(polylines).forEach((polyline) => {
    map.removeLayer(polyline);
  });
  polylines = {};

  // Clear distance labels
  Object.keys(distanceLabels).forEach((key) => {
    distanceLabels[key].forEach(label => {
      map.removeLayer(label);
    });
  });
  distanceLabels = {};

  // Clear groups
  groups = {};
  currentGroup = null;

  // Clear calculations
  document.getElementById("distanceResults").innerHTML = "";
}
