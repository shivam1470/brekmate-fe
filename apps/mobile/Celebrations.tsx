import { useState } from "react";
import { View, Text } from "react-native";
import {
  bookingInput,
  type BookingForm,
  type Booking,
  theme,
} from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
import { useCustomer } from "./context";
import {
  Page,
  Heading,
  Field,
  Button,
  Toggle,
  Feedback,
  QueryState,
  s,
} from "./ui";
const initial: BookingForm = {
  occasion: "birthday",
  guests: "15",
  date: "",
  start: "17:30",
  end: "18:30",
  theme: "",
  photoChannel: "none",
  photoContact: "",
  photoConsent: false,
  cameraAssistanceRequested: false,
};
export function Celebrate() {
  const c = useCustomer(),
    [form, setForm] = useState(initial),
    [sent, setSent] = useState(false);
  const a = useAction();
  const field = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <Page>
      <Heading
        eyebrow="BREKMATE CELEBRATIONS"
        title="Your people. Your occasion."
        description="A premium first-floor space, thoughtful lighting and good company."
      />
      <View style={[s.card, { backgroundColor: "#EDE6D8" }]}>
        <Text style={s.h2}>A place to make memories.</Text>
        <Text style={s.text}>
          Up to 20 guests · Free venue · No minimum food order
        </Text>
        <Text style={s.text}>
          Free camera use. Photos can be shared manually by the café over email
          or WhatsApp, with your consent.
        </Text>
        <Text style={s.muted}>
          Ask the café about the introductory complimentary basic-decoration
          offer, available themes and camera assistance.
        </Text>
      </View>
      <Button
        title="View my celebration enquiries"
        secondary
        onPress={() => c.go("celebrations")}
      />
      {sent ? (
        <View style={s.card}>
          <Text style={s.h2}>Your enquiry is with the café.</Text>
          <Text style={s.text}>
            This is not a confirmed reservation. The team will confirm the slot
            and discuss your theme and decoration.
          </Text>
          <Button title="My enquiries" onPress={() => c.go("celebrations")} />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.h2}>Tell us what you’re planning.</Text>
          <View style={s.row}>
            {(["birthday", "farewell", "office", "casual"] as const).map(
              (v) => (
                <Button
                  key={v}
                  title={v}
                  secondary={form.occasion !== v}
                  disabled={a.busy}
                  onPress={() => field("occasion", v)}
                />
              ),
            )}
          </View>
          <Field
            label="Number of guests (1–20)"
            keyboardType="number-pad"
            value={form.guests}
            onChangeText={(v) => field("guests", v)}
          />
          <Field
            label="Event date (YYYY-MM-DD)"
            placeholder="2030-01-01"
            value={form.date}
            onChangeText={(v) => field("date", v)}
          />
          <Field
            label="Start time in IST (HH:MM)"
            value={form.start}
            onChangeText={(v) => field("start", v)}
          />
          <Field
            label="End time in IST (HH:MM)"
            value={form.end}
            onChangeText={(v) => field("end", v)}
          />
          <Text style={s.muted}>
            Use 24-hour time and 15-minute boundaries. The café confirms
            availability.
          </Text>
          <Field
            label="Theme or decoration request (optional)"
            maxLength={100}
            value={form.theme}
            onChangeText={(v) => field("theme", v)}
          />
          <Toggle
            label="Request help using the camera"
            value={form.cameraAssistanceRequested}
            onChange={(v) => field("cameraAssistanceRequested", v)}
          />
          <Text style={s.label}>How should the café share photos?</Text>
          <View style={s.row}>
            {(["none", "email", "whatsapp"] as const).map((v) => (
              <Button
                key={v}
                title={v === "none" ? "No photos" : v}
                secondary={form.photoChannel !== v}
                onPress={() => {
                  field("photoChannel", v);
                  field("photoConsent", false);
                }}
              />
            ))}
          </View>
          {form.photoChannel !== "none" && (
            <>
              <Field
                label={
                  form.photoChannel === "email"
                    ? "Photo delivery email"
                    : "WhatsApp number with country code"
                }
                value={form.photoContact}
                onChangeText={(v) => field("photoContact", v)}
                autoCapitalize="none"
                keyboardType={
                  form.photoChannel === "email" ? "email-address" : "phone-pad"
                }
              />
              <Toggle
                label="I consent to the café using this contact to share my event photos."
                value={form.photoConsent}
                onChange={(v) => field("photoConsent", v)}
              />
            </>
          )}
          <Text style={s.muted}>
            Photo delivery consent is separate from marketing preferences.
          </Text>
          <Feedback error={a.error} />
          <Button
            title={a.busy ? "Sending enquiry…" : "Send celebration enquiry"}
            disabled={a.busy}
            onPress={() =>
              void a.run(
                () =>
                  c.mutations.run<Booking>(
                    "celebration-enquiry",
                    "POST",
                    "/v1/bookings",
                    bookingInput(form),
                  ),
                () => setSent(true),
              )
            }
          />
        </View>
      )}
    </Page>
  );
}
export function MyCelebrations() {
  const c = useCustomer(),
    q = useQuery(() => c.api.bookings(), [c.api]);
  return (
    <Page>
      <Heading eyebrow="YOUR CELEBRATIONS" title="Memories in the making." />
      <Button title="Refresh enquiries" secondary onPress={q.reload} />
      <QueryState
        loading={q.loading}
        error={q.error}
        empty={!q.data?.length ? "No celebration enquiries yet." : undefined}
        retry={q.reload}
      />
      {q.data?.map((b) => (
        <View style={s.card} key={b.id}>
          <Text style={s.h2}>
            {b.occasion} · {b.guests} guests
          </Text>
          <Text style={s.text}>
            {new Date(b.startsAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST
          </Text>
          <Text
            style={[
              s.text,
              {
                color:
                  b.status === "confirmed" ? theme.green : theme.primaryDark,
              },
            ]}
          >
            {b.status.toUpperCase()}
          </Text>
          <Text style={s.muted}>
            {b.status === "enquiry"
              ? "Awaiting café confirmation. This is not a reservation."
              : b.status === "confirmed"
                ? "The café has reserved this time. Contact the team for changes."
                : "This enquiry / booking was cancelled."}
          </Text>
          <Button
            title="Contact the café about this booking"
            secondary
            onPress={() => c.go("help")}
          />
        </View>
      ))}
      <Button
        title="Plan another celebration"
        onPress={() => c.go("celebrate")}
      />
    </Page>
  );
}
