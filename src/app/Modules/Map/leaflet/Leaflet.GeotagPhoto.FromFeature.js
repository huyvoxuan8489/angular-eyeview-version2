import turfDestination from '@turf/destination'
import turfCentroid from '@turf/centroid'
import turfBearing from '@turf/bearing'
import turfDistance from '@turf/distance'

export function fromFeature (feature, options) {
  options = options || {}
  feature = checkFeatures(feature, options)
  return processFeature(feature, options)
}

var units = 'meters'

function tanDeg (deg) {
  var rad = deg * Math.PI / 180;
  return Math.tan(rad);
}

function cosDeg (deg) {
  var rad = deg * Math.PI / 180
  return Math.cos(rad)
}

function getNested (feature, options) {
  var properties = feature.properties || {}
  if (options.nested) {
    if (properties[options.nested]) {
      properties = properties[options.nested]
    } else {
      properties = {}
    }
  }
  return properties
}

function checkFeatures (feature, options) {
  var properties = getNested(feature, options)
  var angle = properties.angle || options.angle

  var geometryType = feature.geometry.type

  if (geometryType === 'GeometryCollection') {
    if (feature.geometry.geometries.length === 3 &&
        feature.geometry.geometries[0].type === 'Point' &&
        feature.geometry.geometries[1].type === 'Point' &&
        feature.geometry.geometries[2].type === 'Point') {
      return feature
    }
  }
 
  if (geometryType === 'LineString') {
    if (feature.geometry.coordinates.length === 2) {
      return feature
    } else {
      throw new Error('only accepts only accepts LineStrings with two points')
    }
  } 
  else if (geometryType === 'GeometryCollection') {
    if (feature.geometry.geometries.length === 2 &&
        feature.geometry.geometries[0].type === 'Point' &&
        feature.geometry.geometries[1].type === 'Point') {
      return feature
    } else {
      throw new Error('only accepts GeometryCollections containing two Points')
    }
  } 
  else if (geometryType === 'Point') {
    if (properties.bearing !== undefined && properties.distance !== undefined) {
      return feature
    } else {
      throw new Error('only accepts single Points with distance and bearing properties')
    }
  } else {
    throw new Error('only accepts LineStrings with two points, GeometryCollections \n' +
      'containing two Points, or single Points with distance and bearing properties\n' +
      ' - without the angle property set, GeometryCollections with three Points are accepted')
  }
}

function processFeature (feature, options) {
  var geometryType = feature.geometry.type
  if (geometryType === 'Point') {
    return processPoint(feature, options)
  } else if (geometryType === 'LineString') {
    return processLineString(feature, options)
  } else if (geometryType === 'GeometryCollection') {
    return processGeometryCollection(feature, options)
  }
}

function processPoint (feature, options) {
  var properties = getNested(feature, options)

  var distance = properties.distance
  var angle = properties.angle || options.angle

  var centroid = turfDestination(feature, distance, properties.bearing, units)

  var distCentroid = tanDeg(angle / 2) * distance

  var points = [
    turfDestination(centroid, distCentroid, properties.bearing + 90, units),
    turfDestination(centroid, -distCentroid, properties.bearing + 90, units)
  ]

  return {
    type: 'Feature',
    properties: feature.properties,
    geometry: {
      type: 'GeometryCollection',
      geometries: [
        feature.geometry,
        {
          type: 'LineString',
          coordinates: [
            points[0].geometry.coordinates,
            points[1].geometry.coordinates
          ]
        }
      ]
    }
  }
}

function processLineString (feature, options) {
  var properties = getNested(feature, options)
  var angle = properties.angle || options.angle

  var centroid = turfCentroid(feature)

  var points = feature.geometry.coordinates.map(function (coordinate) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coordinate
      }
    }
  })

  var distCentroid = turfDistance(points[0], centroid, units)
  var bearing = turfBearing(points[0], points[1])

  var distCamera = distCentroid / tanDeg(angle / 2)
  var camera = turfDestination(centroid, distCamera, bearing + 90, units)

  return {
    type: 'Feature',
    properties: feature.properties,
    geometry: {
      type: 'GeometryCollection',
      geometries: [
        camera.geometry,
        feature.geometry
      ]
    }
  }
}

function processGeometryCollection (feature, options) {
  var points = feature.geometry.geometries

  var camera = points[0]
  var target = points[1]
  var targetBearing = turfBearing(camera, target)

  var angle

  if (points.length === 2) {
    var properties = getNested(feature, options)
    angle = properties.angle || options.angle
  } else {
    var angleBearing = turfBearing(camera, points[2])
    angle = (Math.abs(angleBearing - targetBearing) * 2) % 180
  }

  var distance = turfDistance(camera, target, units)
  var distFieldOfViewCorner = distance / cosDeg(angle / 2)

  var fieldOfViewPoint1 = turfDestination(camera, distFieldOfViewCorner, targetBearing - angle / 2, units)
  var fieldOfViewPoint2 = turfDestination(camera, distFieldOfViewCorner, targetBearing + angle / 2, units)

  return {
    type: 'Feature',
    properties: Object.assign({}, feature.properties, {
      angle: angle,
      bearing: targetBearing,
      distance: distance
    }),
    geometry: {
      type: 'GeometryCollection',
      geometries: [
        camera,
        {
          type: 'LineString',
          coordinates: [
            fieldOfViewPoint1.geometry.coordinates,
            fieldOfViewPoint2.geometry.coordinates
          ]
        }
      ]
    }
  }
}