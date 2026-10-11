# Using it offline

In a shop with poor reception, or on a phone that dropped off Wi-Fi, the small everyday taps still work. FamilyOS keeps them on the device and sends them when the connection is back.

## What works without a connection

These changes are kept and sent later:

- adding shopping items, and ticking them off or back on
- marking a task done, and putting it back
- marking a chore done, and taking that back

Everything else (editing a task, creating a chore, the calendar, settings, the assistant, Quick add) needs a connection. The app tells you when something did not work.

The app can open without a connection only after it has been opened once online on that phone, over HTTPS (see [HTTPS and phones](https.md)).

## What you see

- The change shows at once with a small **Waiting to send** mark. A line at the top says how many changes are waiting.
- **Offline — showing what was last seen** appears when the app has no connection, or when the server does not answer: the shopping lists, tasks and chores shown are the ones you last opened. The calendar of the days you looked at is kept the same way.
- When the connection is back, waiting changes are sent in the order you made them, and the marks disappear. This happens by itself, on reconnect, when you open the app, and every 30 seconds while something waits (a change that keeps failing is tried less often, up to every 10 minutes).

## When a change cannot be saved

The family may have changed things meanwhile. If you tick off an item someone else already removed, or you may no longer do something, the change is dropped and listed at the top as **1 change could not be saved**, with what it was, the time and the reason. Select the X (or **Dismiss all**) when you have read it.

Problems on the server side (it is restarting, say) do not drop anything: the change stays waiting and is tried again a little later.

## Safety and privacy

- Waiting changes are kept in the browser of that device only, never in a cloud. They hold what you typed (an item name, which task), nothing else; no passwords.
- Every change is sent with a one-time key, so a change that was sent but whose answer got lost is not applied twice. The same protects against a double tap.
- Changes belong to the person who made them. Signing out removes waiting changes, notices and the saved copies of the lists from that browser; another person on the same phone never sends them. Sign out only when you are online if changes are still waiting, or they are discarded.
- Permissions and approval apply when the change reaches the server, not when you tapped. A change that needs approval becomes a suggestion then, like always.
- Wall displays do not queue anything.
