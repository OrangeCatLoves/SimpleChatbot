# Echoes of the Murder Event 7-8 August 2025

## Main Functionality

1. **Submit Code**

   * The user will be required to type /start, select "Submit Code" and then type their code prefixed with a #.
   * The user should then receive a text and/or an image from DetectiveEchoesBot.
   * Attempts to send a code without typing /start should fail
   * "Send Code" action should always start by typing /start command to the bot.

2. **Talk to Admin**

   * The user will be required to type /start, select "Talk to Admins" and then type their message/question
   * The user should then receive the reply from any one of the assigned admin.
   * If the user wants to send another message, they will have to repeat by typing /start again and the cycle repeats.
   * Attempts to send a message without typing /start should fail
   * "Talk to Admin" action should always start by typing /start command to the bot.

## Other information

1. **Allocation of users**

   * Users are allocated to the admin in a round-robin basis so that the workload is spread amongst all registered admins.
   * Admins should be constantly tied to the same user. Meaning that all messages sent by the same user should be sent to the same corresponding admin.
   * .env file should contain all the ADMIN_ID, change th MAP accordingly to match the username to be shown to the users in index.ts.
