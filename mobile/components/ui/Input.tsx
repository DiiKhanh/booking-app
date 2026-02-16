import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  readonly label?: string;
  readonly error?: string;
  readonly leftIcon?: keyof typeof Ionicons.glyphMap;
  readonly isPassword?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  isPassword = false,
  className,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`mb-4 ${className ?? ""}`}>
      {label && (
        <Text className="mb-1.5 text-sm font-body-medium text-neutral-700">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center rounded-md border bg-white px-3 py-3 ${error ? "border-error-500" : "border-neutral-300"}`}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? "#EF4444" : "#94A3B8"}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          className="flex-1 text-base text-neutral-900 font-body"
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="mt-1 text-xs text-error-500">{error}</Text>
      )}
    </View>
  );
}
