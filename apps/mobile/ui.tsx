import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  type TextInputProps,
} from "react-native";
import { theme } from "@brekmate/core";
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.surface },
  content: { padding: 20, paddingBottom: 35, gap: 16 },
  title: {
    fontFamily: theme.display,
    fontSize: 31,
    color: theme.ink,
    letterSpacing: -0.7,
    lineHeight: 37,
  },
  h2: { fontFamily: theme.bodyBold, fontSize: 19, color: theme.ink },
  text: {
    fontFamily: theme.body,
    fontSize: 15,
    color: theme.ink,
    lineHeight: 22,
  },
  muted: {
    fontFamily: theme.body,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 20,
  },
  eyebrow: {
    fontFamily: theme.bodyBold,
    fontSize: 10,
    letterSpacing: 1.7,
    color: theme.primaryDark,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 19,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E7E5E0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  spread: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  error: {
    fontFamily: theme.body,
    fontSize: 14,
    color: "#A12E2A",
    backgroundColor: "#FFF0EF",
    padding: 13,
    borderRadius: 10,
    lineHeight: 21,
  },
  success: {
    fontFamily: theme.body,
    fontSize: 14,
    color: "#21623D",
    backgroundColor: "#E8F5EB",
    padding: 13,
    borderRadius: 10,
    lineHeight: 21,
  },
  label: {
    fontFamily: theme.bodyBold,
    fontSize: 13,
    color: theme.ink,
    marginBottom: 7,
  },
  input: {
    fontFamily: theme.body,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#D8D8D2",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.ink,
    minHeight: 48,
  },
  button: {
    minHeight: 47,
    backgroundColor: theme.primaryDark,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 17,
    paddingVertical: 13,
  },
  buttonText: { fontFamily: theme.bodyBold, fontSize: 14, color: "#fff" },
  secondary: {
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#FFDDC9",
  },
  secondaryText: { color: theme.primaryDark },
  disabled: { opacity: 0.45 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.line,
    minHeight: 43,
  },
  chipActive: {
    backgroundColor: theme.primaryDark,
    borderColor: theme.primaryDark,
  },
  chipText: { fontFamily: theme.bodyBold, fontSize: 12, color: "#596170" },
  chipActiveText: { color: "#fff" },
  empty: { padding: 32, alignItems: "center", gap: 12 },
  divider: { borderTopWidth: 1, borderColor: theme.line, marginVertical: 5 },
});
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <View>
      <Text style={s.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {Boolean(description) && (
        <Text style={[s.muted, { marginTop: 8 }]}>{description}</Text>
      )}
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[s.button, secondary && s.secondary, disabled && s.disabled]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7C838C"
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.spread}>
      <Text style={[s.text, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: "#FFB38E" }}
        thumbColor={value ? theme.primary : undefined}
      />
    </View>
  );
}
export function Feedback({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <>
      {Boolean(error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {Boolean(notice) && (
        <Text accessibilityLiveRegion="polite" style={s.success}>
          {notice}
        </Text>
      )}
    </>
  );
}
export function QueryState({
  loading,
  error,
  empty,
  retry,
}: {
  loading: boolean;
  error?: string;
  empty?: string;
  retry: () => void;
}) {
  return (
    <>
      {loading && (
        <View style={s.row}>
          <ActivityIndicator color={theme.primary} />
          <Text style={s.muted}>Loading…</Text>
        </View>
      )}
      {Boolean(error) && (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
          <Button title="Try again" secondary onPress={retry} />
        </>
      )}
      {!loading && !error && Boolean(empty) && (
        <View style={s.empty}>
          <Text style={s.muted}>{empty}</Text>
        </View>
      )}
    </>
  );
}
