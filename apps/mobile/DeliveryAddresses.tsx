import { useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import * as Crypto from "expo-crypto";
import { type Address } from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
import { useCustomer } from "./context";
import { currentPosition, searchAddress } from "./location";
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
const empty = {
  id: "",
  line: "",
  recipientName: "",
  phone: "",
  floor: "",
  landmark: "",
  latitude: "",
  longitude: "",
};
export function Addresses() {
  const c = useCustomer(),
    q = useQuery(() => c.api.addresses(), [c.api]),
    a = useAction();
  const [form, setForm] = useState(empty),
    [manual, setManual] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [candidates, setCandidates] = useState<
      { latitude: number; longitude: number }[]
    >([]);
  function field(k: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [k]: value }));
    if (["line", "latitude", "longitude"].includes(k)) setConfirmed(false);
  }
  function choose(p: { latitude: number; longitude: number }) {
    setForm((f) => ({
      ...f,
      latitude: String(p.latitude),
      longitude: String(p.longitude),
    }));
    setCandidates([]);
    setConfirmed(false);
  }
  function edit(ad: Address) {
    setForm({
      id: ad.id ?? "",
      line: ad.line,
      recipientName: ad.recipientName ?? "",
      phone: ad.phone ?? "",
      floor: ad.floor ?? "",
      landmark: ad.landmark ?? "",
      latitude: String(ad.latitude),
      longitude: String(ad.longitude),
    });
    setConfirmed(false);
    setCandidates([]);
  }
  function clear() {
    setForm(empty);
    setConfirmed(false);
    setCandidates([]);
  }
  const point =
    form.latitude.trim() &&
    form.longitude.trim() &&
    Number.isFinite(Number(form.latitude)) &&
    Number.isFinite(Number(form.longitude))
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null;
  const service = useQuery(
    () =>
      point
        ? c.api.request<{
            deliverable: boolean;
            distanceKm: number;
            radiusKm: number;
          }>("POST", "/v1/serviceability", point)
        : Promise.resolve(null),
    [c.api, form.latitude, form.longitude],
  );
  async function save() {
    if (
      !form.line.trim() ||
      !form.recipientName.trim() ||
      !/^\+[1-9][0-9]{7,14}$/.test(form.phone.trim())
    )
      throw new Error(
        "Enter the address, recipient name and phone with country code, for example +919876543210.",
      );
    if (
      !point ||
      Math.abs(point.latitude) > 90 ||
      Math.abs(point.longitude) > 180 ||
      !confirmed
    )
      throw new Error("Choose and confirm a valid delivery location.");
    const check = await c.api.request<{ deliverable: boolean }>(
      "POST",
      "/v1/serviceability",
      point,
    );
    if (!check.deliverable)
      throw new Error(
        "Outside the café delivery area. You can choose pickup at checkout.",
      );
    await c.api.request(
      "PUT",
      "/v1/addresses/" + (form.id || Crypto.randomUUID()),
      {
        ...point,
        line: form.line.trim(),
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        floor: form.floor.trim(),
        landmark: form.landmark.trim(),
      },
    );
    clear();
    q.reload();
  }
  return (
    <Page>
      <Heading eyebrow="DELIVERY ADDRESSES" title="Where’s your next break?" />
      <QueryState loading={q.loading} error={q.error} retry={q.reload} />
      {q.data?.map((ad) => (
        <View key={ad.id} style={s.card}>
          <Text style={s.text}>{ad.line}</Text>
          <Text style={s.muted}>
            {ad.recipientName} · {ad.phone}
          </Text>
          {(!ad.recipientName || !ad.phone) && (
            <Text style={s.error}>
              Add recipient details before choosing delivery.
            </Text>
          )}
          <Button title="Edit address" secondary onPress={() => edit(ad)} />
          <Button
            title="Remove address"
            secondary
            disabled={a.busy}
            onPress={() =>
              Alert.alert(
                "Remove saved address?",
                "Existing order records remain.",
                [
                  { text: "Keep", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () =>
                      void a.run(
                        () =>
                          c.mutations.run(
                            "address-delete." + ad.id,
                            "DELETE",
                            "/v1/addresses/" + ad.id,
                            undefined,
                          ),
                        q.reload,
                      ),
                  },
                ],
              )
            }
          />
        </View>
      ))}
      <View style={s.card}>
        <Text style={s.h2}>
          {form.id ? "Edit saved address" : "Add an address"}
        </Text>
        <Field
          label="Recipient name"
          value={form.recipientName}
          onChangeText={(v) => field("recipientName", v)}
          maxLength={100}
        />
        <Field
          label="Recipient phone with country code"
          value={form.phone}
          onChangeText={(v) => field("phone", v)}
          keyboardType="phone-pad"
          maxLength={16}
        />
        <Field
          label="Building, street and delivery instructions"
          value={form.line}
          onChangeText={(v) => field("line", v)}
          multiline
          maxLength={300}
        />
        <Field
          label="Floor / unit (optional)"
          value={form.floor}
          onChangeText={(v) => field("floor", v)}
          maxLength={80}
        />
        <Field
          label="Landmark (optional)"
          value={form.landmark}
          onChangeText={(v) => field("landmark", v)}
          maxLength={120}
        />
        <Button
          title="Use my current location"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => choose(await currentPosition()))
          }
        />
        <Button
          title="Find this address"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              setCandidates(await searchAddress(form.line));
              setConfirmed(false);
            })
          }
        />
        {candidates.map((p, i) => (
          <Button
            key={i}
            title={`Select location ${i + 1}: ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`}
            secondary
            onPress={() => choose(p)}
          />
        ))}
        {point && (
          <>
            <Text style={s.muted}>
              Selected location: {point.latitude.toFixed(5)},{" "}
              {point.longitude.toFixed(5)}
            </Text>
            <Button
              title="Check selected location in Maps"
              secondary
              onPress={() =>
                void a.run(() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`,
                  ),
                )
              }
            />
            <QueryState
              loading={service.loading}
              error={service.error}
              retry={service.reload}
            />
            {service.data && (
              <Text style={service.data.deliverable ? s.text : s.error}>
                {service.data.deliverable
                  ? "Within delivery area"
                  : `Outside the ${service.data.radiusKm} km delivery area`}{" "}
                · {service.data.distanceKm} km from café
              </Text>
            )}
            <Toggle
              label="I confirm this is the delivery location"
              value={confirmed}
              onChange={setConfirmed}
            />
          </>
        )}
        <Button
          title={
            manual
              ? "Hide manual location fields"
              : "Enter map coordinates manually"
          }
          secondary
          onPress={() => setManual((v) => !v)}
        />
        {manual && (
          <>
            <Field
              label="Latitude"
              value={form.latitude}
              onChangeText={(v) => field("latitude", v)}
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label="Longitude"
              value={form.longitude}
              onChangeText={(v) => field("longitude", v)}
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}
        <Text style={s.muted}>
          Verify the selected location in Maps and confirm. We capture location
          only when requested; there is no continuous tracking. We use the phone
          number for your delivery.
        </Text>
        <Button
          title="Save address"
          disabled={
            a.busy ||
            !confirmed ||
            service.loading ||
            !!service.error ||
            !service.data?.deliverable
          }
          onPress={() => void a.run(save)}
        />
        {form.id && <Button title="Cancel edit" secondary onPress={clear} />}
      </View>
      <Feedback error={a.error} notice={a.notice} />
    </Page>
  );
}
