# Email

Email lets school notices, invitations and bills reach Quick add without anyone opening the app. It is optional. FamilyOS reads **one dedicated mailbox** every few minutes and turns the unread mail of the people you allow into Quick add items, marked Email. Quick add then reads them like anything else you share: suggestions wait for someone to approve them.

## Why a dedicated mailbox

FamilyOS logs in to the mailbox with an IMAP user name and an **app password**. Most families should not hand that to their personal inbox, so make a mailbox only for this:

- an address on your own domain, or at Fastmail, mailbox.org or a similar provider;
- a mail server you run yourself;
- Proton Mail through Proton Bridge. Bridge uses a certificate it made itself, so give FamilyOS the Bridge certificate authority with the standard Node setting `NODE_EXTRA_CA_CERTS` (certificates are always checked).

**Gmail and Outlook.com accounts cannot be connected directly.** They only accept a Google or Microsoft sign-in (OAuth) for IMAP, and FamilyOS does not use those sign-ins. Forward from them instead (see below).

## Connect the mailbox (admin, once)

1. Create the mailbox and an app password for it (or its normal password if your provider has no app passwords).
2. In FamilyOS open **Settings → System → Email**.
3. Enter the **IMAP server** (for example `imap.fastmail.com`), the **Port** (`993`), the **User name** and the **Password**.
4. Leave **Mailbox to read** as `INBOX` and **Move handled mail to** as `FamilyOS` (it is created if it does not exist).
5. Press **Save and test**. FamilyOS logs in, opens the mailbox and creates the folder. If something is wrong the page says what: wrong user name or password, server not reachable, certificate refused, mailbox missing, folder not usable. What you typed is saved, but reading stays switched off until a test works.

The connection is **always encrypted**: port 993 uses TLS from the start, port 143 must upgrade with STARTTLS or the connection is refused. There is no plain option. The password is stored encrypted and never shown again; leave the field empty on later saves to keep it.

Email only works while the FamilyOS worker is running (the default, see `FAMOS_ROLES`).

## Allow senders

Mail from addresses that are **not** on the list is ignored. Under **Allowed senders** press **Add sender**; in the panel enter the **Email address**, choose **Goes to the Quick add of** a family member, add a **Note (optional)** if you like and press **Add sender** again to save. The item is added as that person, so the same rules as in the app apply: it is theirs alone, a supervised member's suggestions wait for approval, and the daily upload limit counts. When the mail has been read and has suggestions, that person gets a notification.

- Add the school's address (`office@school.example`) to put its mail in a parent's Quick add.
- Add each parent's own address to let them forward mail to the family mailbox.

Mail from an address you have not allowed stays untouched in the mailbox. The page counts it ("3 messages from unknown senders are waiting in the mailbox"). Once you add that address, the waiting mail is looked at again at the next check.

### A note on forged senders

Anyone can write any address in the From line. If your mailbox provider adds an `Authentication-Results` header (most do) and it says SPF or DKIM **failed**, FamilyOS refuses the message and counts it under "messages refused". It stays in the mailbox. Mail that merely arrives without such a header is accepted when the sender is on your list.

## Forwarding from Gmail, Outlook and school portals

Forward to the family mailbox. Which address FamilyOS sees as the sender depends on how you forward:

- **A filter that forwards the mail as it is** (Gmail: Settings → Filters and blocked addresses → forward to; first confirm the forwarding address). The sender stays the school, but the forwarding server's address often fails SPF at the family mailbox, which then gets refused. If you see mail counted as refused, forward by the next method.
- **Forward by hand** with the normal "Forward" button, or use an Outlook rule that forwards to the family mailbox. The mail is then sent from your own account, so the sender is you: add your own address as an allowed sender. Do not use "Forward as attachment": the original is inside an attachment that is not read.
- **School portals** usually mail from a no-reply address. Add that address as a sender, or have the portal send to a personal address of yours and forward from there.

Forwarded text is read from the message body. Attachments are kept.

## What is read, and what never is

Read and kept:

- the subject (as the title) and the **plain text** of the message. If a message has only HTML, FamilyOS converts it to text on the server: tags are dropped, line breaks and lists are kept, and links are written out as text next to what they say;
- attachments that really are PDFs, pictures, audio or plain text files, at most 6 per mail and 25 MB together (Quick add's limits). Pictures lose their location data like any other photo. FamilyOS looks at the first bytes of each file, so a file called `invoice.pdf` that is not a PDF is skipped. Pictures that are part of the mail's layout (logos, signatures) are skipped too.

Never done:

- no picture, link, font or script in a mail is ever loaded, so tracking pixels do nothing and the sender cannot tell that you read it;
- HTML mail is never shown;
- text a person cannot see is removed: zero-width and direction-control characters, and HTML that is hidden (`display:none`, zero font size, white on white). That text is a common way to slip instructions to an AI;
- other attachments (programs, archives, calendar files, Office files) are ignored;
- the mailbox password, addresses, subjects and mail text are **not written to the logs**. The logs only say how many messages were looked at.

## How it works day to day

- A check runs every 5 minutes (change it under **Check every (minutes)**, 2 or more). **Check now** asks the worker to look immediately.
- Only unread mail is looked at. If you open a message in a mail app before the check, it is not picked up. At most 40 messages are handled per check; the rest wait for the next one. A message larger than 40 MB is refused.
- A mail from an allowed sender becomes a Quick add item, then moves to the **FamilyOS** folder. The mailbox is therefore your own record of what was taken. Mail that was refused or from unknown senders stays where it is.
- The same message is never added twice, even if the mail server delivers it again or you move it back.
- If a message cannot be added (for example the daily upload limit is reached or Quick add is off), it stays where it is, the page says how many could not be added and will be tried again, and the next check retries them. One failing message never blocks the others.
- Under **Status** you see whether it is working, the last check, how many mails were added so far, and any problem with the connection.

## Turning it off

Switch **Read this mailbox** off and press **Save and test** to pause. **Forget this mailbox** (then **Yes, forget it**) removes the saved connection and password; the allowed senders stay.
