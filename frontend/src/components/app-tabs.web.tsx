import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { Pressable, View, StyleSheet } from "react-native";

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot
        style={{
          flex: 1,
          height: "100%",
          width: "100%",
        }}
      />

      <TabList asChild>
        <CustomTabList>
          <TabTrigger
            name="home"
            href="/"
            asChild
          >
            <TabButton>
              Home
            </TabButton>
          </TabTrigger>

          <TabTrigger
            name="explore"
            href="/explore"
            asChild
          >
            <TabButton>
              Explore
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      style={styles.hiddenButton}
    >
      <View>{children}</View>
    </Pressable>
  );
}

export function CustomTabList(
  props: TabListProps
) {
  return (
    <View
      {...props}
      style={styles.hiddenTabList}
      accessible={false}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  hiddenTabList: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },

  hiddenButton: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});