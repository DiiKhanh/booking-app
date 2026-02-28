import { View, Text } from "react-native";
import MapView, { Marker, type MapPressEvent, type MarkerDragStartEndEvent } from "react-native-maps";

interface Coordinate {
  readonly latitude: number;
  readonly longitude: number;
}

interface LocationPickerProps {
  coordinate: Coordinate;
  onCoordinateChange: (coord: Coordinate) => void;
}

const VIETNAM_CENTER: Coordinate = { latitude: 14.0583, longitude: 108.2772 };

export function LocationPicker({ coordinate, onCoordinateChange }: LocationPickerProps) {
  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onCoordinateChange({ latitude, longitude });
  };

  const handleDragEnd = (e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onCoordinateChange({ latitude, longitude });
  };

  const displayCoord = coordinate.latitude === 0 && coordinate.longitude === 0
    ? VIETNAM_CENTER
    : coordinate;

  return (
    <View>
      <MapView
        style={{ height: 280, borderRadius: 12, overflow: "hidden" }}
        initialRegion={{
          latitude: VIETNAM_CENTER.latitude,
          longitude: VIETNAM_CENTER.longitude,
          latitudeDelta: 8,
          longitudeDelta: 8,
        }}
        region={
          coordinate.latitude !== 0 || coordinate.longitude !== 0
            ? { latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : undefined
        }
        onPress={handleMapPress}
      >
        <Marker
          coordinate={displayCoord}
          draggable
          onDragEnd={handleDragEnd}
          pinColor="#FF5733"
        />
      </MapView>

      <View className="mt-2 px-1 flex-row items-center gap-4">
        <Text
          style={{
            fontFamily: "Inter-Regular",
            fontSize: 12,
            color: "#64748B",
            fontVariant: ["tabular-nums"],
          }}
        >
          Lat: {displayCoord.latitude.toFixed(4)}
        </Text>
        <Text
          style={{
            fontFamily: "Inter-Regular",
            fontSize: 12,
            color: "#64748B",
            fontVariant: ["tabular-nums"],
          }}
        >
          Lng: {displayCoord.longitude.toFixed(4)}
        </Text>
      </View>
    </View>
  );
}
