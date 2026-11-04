# Creating real Arabic audio without paid APIs on iPad

1. Launch **Shortcuts** and create a new shortcut named `Nibor Voice`.
2. Set its input to **Text** (`Shortcut Input`).
3. Add **Make Spoken Audio from Text**, using **Shortcut Input** as the text. Choose an installed Arabic voice if available; voice list depends on iPadOS.
4. Add **Save File** and enable **Ask Where to Save**.
5. In Nibor Motion, choose a scene, write or prepare narration, tap **Run voice shortcut**. If deep linking fails, tap **Copy** and paste text into your Shortcut instead.
6. After the shortcut saves its audio, return to Nibor Motion, choose the same scene, and select the saved file with **Import audio for this scene**. It is stored locally by scene ID.
7. Check the player in that scene, then export a short video and check for an actual audio track.

This uses Apple on-device capabilities, with no OpenAI key or subscription. It does not yet automate bringing the saved audio back from Shortcuts to Safari.
