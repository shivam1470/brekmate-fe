import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  visibleMenu,
  addItem,
  type Product,
  formatMoney,
  theme,
} from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
import { useCustomer } from "./context";
import {
  Page,
  Heading,
  Button,
  Field,
  Toggle,
  Feedback,
  QueryState,
  s,
} from "./ui";
export function Menu() {
  const c = useCustomer(),
    q = useQuery(() => c.api.menu(), [c.api]);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [selected, setSelected] = useState<Product | null>(null);
  const menu = q.data ?? [];
  const categories = [
    "All",
    ...new Set(
      menu.filter((p) => p.available && p.stock > 0).map((p) => p.category),
    ),
  ];
  const shown = visibleMenu(menu, search, category);
  return (
    <>
      <Page>
        <Heading
          eyebrow="PURE VEGETARIAN · GURUGRAM"
          title="Good food. Better breaks."
          description="Fresh from the café, whenever you need a little pause."
        />
        <View style={styles.search}>
          <Text style={{ fontSize: 19 }}>⌕</Text>
          <TextInput
            accessibilityLabel="Search menu"
            value={search}
            onChangeText={setSearch}
            placeholder="Samosa, chai, sandwiches…"
            placeholderTextColor={theme.muted}
            style={[s.text, { flex: 1, padding: 7 }]}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {categories.map((cat) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: cat === category }}
              key={cat}
              style={[s.chip, cat === category && s.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[s.chipText, cat === category && s.chipActiveText]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.hero}>
          <Text style={styles.heroSmall}>YOUR NEXT BREAK IS ON THE WAY</Text>
          <Text style={styles.heroTitle}>Free delivery{`\n`}above ₹99.</Text>
          <Text style={styles.heroBody}>
            Fresh vegetarian favourites, delivered nearby.
          </Text>
          <Text style={styles.heroFine}>
            ₹20 delivery on item subtotals up to ₹99. Pickup is free.
          </Text>
        </View>
        <View style={s.spread}>
          <Text accessibilityRole="header" style={s.h2}>
            {category === "All" ? "Fresh from our kitchen" : category}
          </Text>
          <Button
            title="Refresh"
            secondary
            onPress={q.reload}
            disabled={q.loading}
          />
        </View>
        <QueryState
          loading={q.loading && !q.data}
          error={q.error}
          empty={
            !shown.length ? "No available items match your search." : undefined
          }
          retry={q.reload}
        />
        <View style={styles.grid}>
          {shown.map((p) => (
            <View key={p.sku} style={styles.food}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Customize ${p.name}`}
                onPress={() => setSelected(p)}
              >
                <View style={styles.foodVisual}>
                  <Text style={styles.foodInitial}>{p.name[0]}</Text>
                  <Text style={styles.foodCategory}>{p.category}</Text>
                </View>
                <View style={{ padding: 13, gap: 8 }}>
                  <Text
                    style={{
                      color: theme.green,
                      fontSize: 10,
                      fontFamily: theme.bodyBold,
                    }}
                  >
                    ▣ PURE VEG
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      s.text,
                      { fontFamily: theme.bodyBold, minHeight: 43 },
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text style={s.muted}>{formatMoney(p.pricePaise)}</Text>
                </View>
              </Pressable>
              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                <Button title="Add +" onPress={() => setSelected(p)} />
              </View>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => c.go("celebrate")}
          style={styles.celebrate}
        >
          <Text style={s.eyebrow}>A SPACE FOR YOUR OCCASION</Text>
          <Text style={[s.title, { fontSize: 26, lineHeight: 31 }]}>
            Small gatherings.{`\n`}Lasting memories.
          </Text>
          <Text style={[s.muted, { marginVertical: 10 }]}>
            A first-floor space for birthdays, farewells and office
            celebrations. Free venue. No minimum food order.
          </Text>
          <Text
            style={{ fontFamily: theme.bodyBold, color: theme.primaryDark }}
          >
            Explore celebrations →
          </Text>
        </Pressable>
      </Page>
      {selected && (
        <ProductSheet product={selected} close={() => setSelected(null)} />
      )}
    </>
  );
}
function ProductSheet({
  product: p,
  close,
}: {
  product: Product;
  close: () => void;
}) {
  const c = useCustomer();
  const [addons, setAddons] = useState<string[]>([]),
    [instructions, setInstructions] = useState("");
  const a = useAction();
  return (
    <Modal visible animationType="slide" onRequestClose={close} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 15, padding: 23 }}
          >
            <View style={s.spread}>
              <Text accessibilityRole="header" style={[s.h2, { flex: 1 }]}>
                {p.name}
              </Text>
              <Button title="Close" secondary onPress={close} />
            </View>
            <Text style={s.muted}>
              {formatMoney(p.pricePaise)} · Pure vegetarian
            </Text>
            {Object.entries(p.addons).map(([id, price]) => (
              <Toggle
                key={id}
                label={`${id} + ${formatMoney(price)}`}
                value={addons.includes(id)}
                onChange={(on) =>
                  setAddons((old) =>
                    on ? [...old, id] : old.filter((v) => v !== id),
                  )
                }
              />
            ))}
            <Field
              label="Kitchen instructions (optional)"
              value={instructions}
              onChangeText={setInstructions}
              maxLength={300}
              multiline
            />
            <Feedback error={a.error} />
            <Button
              title="Add to basket"
              disabled={a.busy}
              onPress={() =>
                void a.run(async () => {
                  if (await c.mutations.pending("checkout"))
                    throw new Error(
                      "Check the pending checkout in your basket before adding items.",
                    );
                  const cart = addItem(c.cart, p, addons, instructions);
                  c.setCart(cart);
                }, close)
              }
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  search: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: theme.line,
  },
  hero: {
    backgroundColor: theme.primary,
    borderRadius: 21,
    padding: 23,
    gap: 10,
  },
  heroSmall: {
    fontFamily: theme.bodyBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: theme.ink,
  },
  heroTitle: {
    fontFamily: theme.display,
    fontSize: 34,
    lineHeight: 39,
    color: "#fff",
  },
  heroBody: {
    fontFamily: theme.body,
    fontSize: 14,
    color: theme.ink,
    lineHeight: 21,
  },
  heroFine: {
    fontFamily: theme.body,
    fontSize: 11,
    lineHeight: 17,
    color: theme.ink,
  },
  grid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  food: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.line,
  },
  foodVisual: {
    height: 122,
    backgroundColor: "#EEEAE1",
    padding: 15,
    justifyContent: "space-between",
  },
  foodInitial: {
    fontFamily: theme.display,
    fontSize: 54,
    lineHeight: 60,
    color: "#A58C6D",
  },
  foodCategory: { fontFamily: theme.bodyBold, fontSize: 10, color: "#705F4B" },
  celebrate: {
    backgroundColor: "#EDE6D8",
    borderRadius: 20,
    padding: 23,
    marginTop: 8,
  },
  overlay: { flex: 1, backgroundColor: "#0007", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "90%",
  },
});
