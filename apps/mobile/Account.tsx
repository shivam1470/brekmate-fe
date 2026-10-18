import { useState } from "react";
import { View, Text, Alert } from "react-native";
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
export function Account() {
  const c = useCustomer(),
    [name, setName] = useState(""),
    [marketing, setMarketing] = useState(false),
    [referral, setReferral] = useState(""),
    [deletion, setDeletion] = useState("");
  const a = useAction();
  const q = useQuery(async () => {
    const profile = await c.api.profile();
    setName(profile.name);
    setMarketing(profile.preferences.marketing);
    return profile;
  }, [c.api]);
  return (
    <Page>
      <Heading
        eyebrow="YOUR BREKMATE"
        title="Make yourself at home."
        description={c.user.email}
      />
      <QueryState loading={q.loading} error={q.error} retry={q.reload} />
      <View style={s.card}>
        <Field
          label="Your name"
          maxLength={100}
          value={name}
          onChangeText={setName}
        />
        <Toggle
          label="I’d like marketing updates from BrekMate."
          value={marketing}
          onChange={setMarketing}
        />
        <Button
          title="Save preferences"
          disabled={a.busy || !name.trim()}
          onPress={() =>
            void a.run(
              () =>
                c.api.request("PUT", "/v1/profile", {
                  name: name.trim(),
                  preferences: { marketing },
                }),
              q.reload,
            )
          }
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Invited by a friend?</Text>
        <Text style={s.muted}>
          Add their code before creating your first order.
        </Text>
        <Field
          label="Referral code"
          value={referral}
          onChangeText={setReferral}
          autoCapitalize="none"
          maxLength={16}
        />
        <Button
          title="Apply referral code"
          secondary
          disabled={a.busy || !/^[a-f0-9]{16}$/.test(referral)}
          onPress={() =>
            void a.run(() =>
              c.mutations.run("referral", "POST", "/v1/referrals", {
                code: referral,
              }),
            )
          }
        />
      </View>
      <Button
        title="My delivery addresses"
        secondary
        onPress={() => c.go("addresses")}
      />
      <Button
        title="My celebration enquiries"
        secondary
        onPress={() => c.go("celebrations")}
      />
      <Button
        title="Order updates"
        secondary
        onPress={() => c.go("notifications")}
      />
      <Button title="Help & support" secondary onPress={() => c.go("help")} />
      <Button title="Sign out" secondary onPress={c.signOut} />
      <View style={s.card}>
        <Text style={s.h2}>Close your account</Text>
        <Text style={s.muted}>
          This disables access and sends an erasure request to the café.
          Financial and order records are retained pending retention review. It
          does not immediately erase all data.
        </Text>
        <Field
          label="Type DELETE to request account closure"
          value={deletion}
          onChangeText={setDeletion}
          autoCapitalize="characters"
        />
        <Button
          title="Request account closure"
          secondary
          disabled={a.busy || deletion !== "DELETE"}
          onPress={() =>
            Alert.alert(
              "Disable your account?",
              "You will lose access to orders and rewards. The café will review data erasure separately.",
              [
                { text: "Keep account", style: "cancel" },
                {
                  text: "Disable account",
                  style: "destructive",
                  onPress: () =>
                    void a.run(
                      () =>
                        c.mutations.run(
                          "account-delete",
                          "DELETE",
                          "/v1/profile",
                          undefined,
                        ),
                      c.closeSession,
                    ),
                },
              ],
            )
          }
        />
      </View>
      <Feedback error={a.error} notice={a.notice} />
    </Page>
  );
}
export { Addresses } from "./DeliveryAddresses";
export function Notifications() {
  const c = useCustomer(),
    q = useQuery(
      () =>
        c.api.all<{ orderId: string; status: string; createdAt: string }>(
          "/v1/notifications",
        ),
      [c.api],
    );
  return (
    <Page>
      <Heading eyebrow="ORDER UPDATES" title="Fresh from the café." />
      <Button title="Refresh updates" secondary onPress={q.reload} />
      <QueryState
        loading={q.loading}
        error={q.error}
        empty={!q.data?.length ? "No updates yet." : undefined}
        retry={q.reload}
      />
      {[...(q.data ?? [])].reverse().map((n, i) => (
        <View key={i} style={s.card}>
          <Text style={s.text}>
            Order #{n.orderId.slice(0, 8)} · {n.status.replaceAll("_", " ")}
          </Text>
          <Text style={s.muted}>
            {new Date(n.createdAt).toLocaleString("en-IN")}
          </Text>
          <Button
            title="View order"
            secondary
            onPress={() => c.go("order", n.orderId)}
          />
        </View>
      ))}
    </Page>
  );
}
export function Help() {
  const c = useCustomer(),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [sent, setSent] = useState(false);
  const a = useAction();
  return (
    <Page>
      <Heading
        eyebrow="HERE TO HELP"
        title="Let’s make it right."
        description={
          c.id
            ? `About order #${c.id.slice(0, 8)}`
            : "Send your question to the café team."
        }
      />
      {sent ? (
        <View style={s.card}>
          <Text style={s.h2}>Your request is with the team.</Text>
          <Text style={s.text}>
            The café will review it. Replies are currently handled outside the
            app.
          </Text>
        </View>
      ) : (
        <View style={s.card}>
          <Field
            label="Subject"
            maxLength={150}
            value={subject}
            onChangeText={setSubject}
          />
          <Field
            label="How can we help?"
            maxLength={2000}
            value={message}
            onChangeText={setMessage}
            multiline
            style={{ minHeight: 130, textAlignVertical: "top" }}
          />
          <Text style={s.muted}>
            Do not include card details, passwords or your delivery code.
          </Text>
          <Button
            title="Send support request"
            disabled={a.busy || !subject.trim() || !message.trim()}
            onPress={() =>
              void a.run(
                () =>
                  c.mutations.run("support-ticket", "POST", "/v1/support", {
                    subject: subject.trim(),
                    message: message.trim(),
                    ...(c.id ? { orderId: c.id } : {}),
                  }),
                () => setSent(true),
              )
            }
          />
          <Feedback error={a.error} />
        </View>
      )}
      <View style={s.card}>
        <Text style={s.h2}>Good to know</Text>
        <Text style={s.text}>
          Delivery is free strictly above ₹99 in item subtotal. Pickup is always
          free.
        </Text>
        <Text style={s.text}>
          Rewards can cover up to 20% of the item subtotal. They cannot be
          topped up or withdrawn.
        </Text>
        <Text style={s.text}>
          A celebration enquiry becomes a reservation only when the café
          confirms it.
        </Text>
      </View>
    </Page>
  );
}
