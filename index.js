const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require("discord.js");

const os = require("os");
const config = require("./config.json");

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

let statusMessageId = null;

/* ================= HELPER ================= */

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${d} hari, ${h} jam, ${m} menit, ${s} detik`;
}

function getRamUsage() {
  return `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`;
}

// Simpan snapshot sebelumnya biar bisa hitung DELTA (lebih akurat dari cumulative-since-boot)
let prevCpuInfo = null;

function getCpu() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  cpus.forEach(c => {
    for (const t in c.times) total += c.times[t];
    idle += c.times.idle;
  });

  if (!prevCpuInfo) {
    prevCpuInfo = { idle, total };
    return "0%"; // baru pertama kali dipanggil, belum ada delta
  }

  const idleDiff = idle - prevCpuInfo.idle;
  const totalDiff = total - prevCpuInfo.total;
  prevCpuInfo = { idle, total };

  if (totalDiff <= 0) return "0%";
  return `${Math.round(100 - (idleDiff / totalDiff) * 100)}%`;
}

/* ================= STATUS EMBED ================= */

async function updateStatusEmbed(guild) {
  let channel = guild.channels.cache.get(config.statusChannelId);
  if (!channel) {
    // fallback fetch kalau belum ke-cache
    try {
      channel = await guild.channels.fetch(config.statusChannelId);
    } catch {
      return console.error("❌ statusChannelId tidak ditemukan / bot tidak punya akses ke channel itu.");
    }
  }
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("🛍️ Ahmad Store")
    .addFields(
      { name:"🟢 Status", value:"Online", inline:true },
      { name:"⏰ Uptime", value:formatUptime(process.uptime()), inline:true },
      { name:"👥 Member", value:`${guild.memberCount}`, inline:true },
      { name:"📡 Ping", value:`${Math.round(client.ws.ping)} ms`, inline:true },
      { name:"💾 RAM", value:getRamUsage(), inline:true },
      { name:"🧠 CPU", value:getCpu(), inline:true }
    )
    .setTimestamp();

  try {
    if (!statusMessageId) {
      const msg = await channel.send({ embeds:[embed] });
      statusMessageId = msg.id;
    } else {
      const msg = await channel.messages.fetch(statusMessageId);
      await msg.edit({ embeds:[embed] });
    }
  } catch {
    statusMessageId = null;
  }
}

/* ================= SLASH COMMAND ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Kirim feedback pembelian")
    .addStringOption(o => o.setName("seller").setDescription("Nama Seller").setRequired(true))
    .addStringOption(o => o.setName("buyer").setDescription("Nama Buyer").setRequired(true))
    .addStringOption(o => o.setName("produk").setDescription("Nama Produk").setRequired(true))
    .addStringOption(o => o.setName("harga").setDescription("Harga Produk").setRequired(true))
    .addIntegerOption(o =>
      o.setName("rating")
        .setDescription("Rating 1-5")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
    )
    .addStringOption(o => o.setName("komentar").setDescription("Komentar").setRequired(true)),
    
    new SlashCommandBuilder()
  .setName("testimoni")
  .setDescription("Testimoni transaksi")
  .addStringOption(o => o.setName("ke").setDescription("Transaksi ke siapa").setRequired(true))
  .addStringOption(o => o.setName("penjual").setDescription("Nama Penjual").setRequired(true))
  .addStringOption(o => o.setName("pembeli").setDescription("Nama Pembeli").setRequired(true))
  .addStringOption(o => o.setName("produk").setDescription("Nama Produk").setRequired(true))
  .addStringOption(o => o.setName("harga").setDescription("Harga Produk").setRequired(true))
  .addStringOption(o => o.setName("pembayaran").setDescription("Metode Pembayaran").setRequired(true))
  .addStringOption(o =>
    o.setName("status")
      .setDescription("Status transaksi")
      .setRequired(true)
      .addChoices(
        { name: "Sukses", value: "Sukses ✅" },
        { name: "Pending", value: "Pending ⏳" },
        { name: "Gagal", value: "Gagal ❌" }
      )
  )
  .addAttachmentOption(o =>
    o.setName("foto")
      .setDescription("Foto bukti transaksi")
      .setRequired(false)
  ),
    
 new SlashCommandBuilder()
    .setName("store")
    .setDescription("Update status store")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ADMIN ONLY
    .addStringOption(o =>
      o.setName("status")
        .setDescription("open / close")
        .setRequired(true)
        .addChoices(
          { name: "Open", value: "open" },
          { name: "Close", value: "close" }
        )
    ),
    
new SlashCommandBuilder()
  .setName("expired")
  .setDescription("Kirim detail hosting yang akan expired")
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ADMIN ONLY
  .addStringOption(o =>
    o.setName("hosting")
      .setDescription("Nama / Paket Hosting")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("buyer")
      .setDescription("Nama Buyer")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("expired")
      .setDescription("Tanggal Expired")
      .setRequired(true)
  ),
  
new SlashCommandBuilder()
  .setName("sendhosting")
  .setDescription("Kirim detail hosting ke buyer (Auto DM + Log)")
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  .addUserOption(o =>
    o.setName("buyer")
      .setDescription("User buyer")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("username")
      .setDescription("Username hosting")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("password")
      .setDescription("Password hosting")
      .setRequired(true)
  ),
    
new SlashCommandBuilder()
    .setName("payment")
    .setDescription("Metode pembayaran Ahmad Store"),

new SlashCommandBuilder()
  .setName("ticketpanel")
  .setDescription("Kirim panel pembukaan ticket support")
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // ADMIN ONLY
].map(cmd => cmd.toJSON());

const rest = new REST({version:"10"}).setToken(config.token);

(async()=>{
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log("✅ Slash command terdaftar");
  } catch (err) {
    console.error("❌ Gagal mendaftarkan slash command:", err);
  }
})();

/* ================= READY ================= */

// "clientReady" cuma ada mulai discord.js v14.16+. Kalau versi lo lebih lama,
// event ini gak bakal nyala sama sekali (silent fail, bot gak pernah dianggap online).
// Makanya kita dengerin dua-duanya + guard biar gak jalan dobel.
let botReadyFired = false;
async function onBotReady() {
  if (botReadyFired) return;
  botReadyFired = true;

  console.log(`🤖 Bot online: ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(config.guildId);
    updateStatusEmbed(guild);
    setInterval(() => updateStatusEmbed(guild), 60000);
  } catch (err) {
    console.error("❌ Gagal fetch guild, cek config.guildId:", err);
  }
}

client.once("clientReady", onBotReady);
client.once("ready", onBotReady);

/* ================= ERROR HANDLING GLOBAL ================= */

client.on("error", err => console.error("❌ Client error:", err));
process.on("unhandledRejection", err => console.error("❌ Unhandled rejection:", err));

client.on("guildMemberAdd",m=>updateStatusEmbed(m.guild));
client.on("guildMemberRemove",m=>updateStatusEmbed(m.guild));

/* ================= INTERACTION ================= */

client.on("interactionCreate",async interaction=>{
 try {

/* ===== BUTTON ===== */

  if (interaction.isButton()) {

    if (interaction.customId === "pay_dana") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("💚 Pembayaran DANA")
            .setColor(0x00FF00)
            .setDescription(
              "**Nomor:** `087803550445`\n" +
              "**Atas Nama:** Ahmad Store\n\n" +
              "⚠️ Kirim bukti transfer setelah pembayaran."
            )
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (interaction.customId === "pay_gopay") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("💙 Pembayaran GoPay")
            .setColor(0x00FF00)
            .setDescription(
              "**Nomor:** `087854851480`\n" +
              "**Atas Nama:** Ahmad Store\n\n" +
              "⚠️ Kirim bukti transfer setelah pembayaran."
            )
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (interaction.customId === "pay_qris") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("💜 Pembayaran QRIS")
            .setColor(0x00FF00)
            .setDescription("Scan QR di bawah untuk membayar.")
            .setImage("https://cdn.discordapp.com/attachments/1459600476445212824/1470347341151076372/1770628485826.png")
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    /* ===== TICKET: BUKA ===== */
    if (interaction.customId === "open_ticket") {
      const guild = interaction.guild;
      const channelName = `ticket-${interaction.user.username}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 90);

      const existing = guild.channels.cache.find(
        c => c.name === channelName && c.parentId === config.ticketCategoryId
      );
      if (existing) {
        return interaction.reply({
          content: `❌ Kamu sudah punya ticket aktif di ${existing}`,
          ephemeral: true
        });
      }

      let ticketChannel;
      try {
        ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: config.ticketCategoryId, // wajib category channel, bukan text channel
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: config.ticketSupportRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageChannels
              ]
            }
          ]
        });
      } catch (err) {
        console.error("❌ Gagal membuat channel ticket. Cek config.ticketCategoryId & permission bot:", err);
        return interaction.reply({
          content: "❌ Gagal membuat ticket. Hubungi Admin.",
          ephemeral: true
        });
      }

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: `${interaction.user} <@&${config.ticketSupportRoleId}>`,
        embeds: [
          new EmbedBuilder()
            .setTitle("🎫 Ticket Support — Ahmad Store")
            .setColor("Blue")
            .setDescription(
              "Halo! Silakan jelaskan kendala / komplain kamu di sini.\n" +
              "Tim support akan segera merespon.\n\n" +
              "Klik tombol di bawah untuk menutup ticket ini kalau sudah selesai."
            )
            .setFooter({ text: `Dibuka oleh ${interaction.user.tag}` })
            .setTimestamp()
        ],
        components: [closeRow]
      });

      return interaction.reply({
        content: `✅ Ticket berhasil dibuat: ${ticketChannel}`,
        ephemeral: true
      });
    }

    /* ===== TICKET: TUTUP ===== */
    if (interaction.customId === "close_ticket") {
      const isSupport = interaction.member.roles.cache.has(config.ticketSupportRoleId);
      const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!isSupport && !isAdmin) {
        return interaction.reply({
          content: "❌ Hanya tim Support / Admin yang bisa menutup ticket.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: "🔒 Ticket akan ditutup dalam 5 detik..."
      });

      const logChannel = interaction.guild.channels.cache.get(config.ticketLogChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔒 Ticket Ditutup")
              .setColor("Red")
              .addFields(
                { name: "📌 Channel", value: `${interaction.channel.name}`, inline: true },
                { name: "🛠️ Ditutup oleh", value: `${interaction.user.tag}`, inline: true }
              )
              .setTimestamp()
          ]
        });
      }

      setTimeout(() => {
        interaction.channel.delete().catch(err =>
          console.error("❌ Gagal menghapus channel ticket:", err)
        );
      }, 5000);

      return;
    }

  }

/* ===== FEEDBACK ===== */

  // FEEDBACK
if (interaction.commandName === "feedback") {
  if (!interaction.member.roles.cache.has(config.buyerRoleId)) {
    return interaction.reply({
      content: "❌ Hanya **Buyer** yang bisa mengirim feedback.",
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("📩 Feedback Pembelian")
    .setColor("Green")
    .addFields(
      { name: "🛒 Seller", value: interaction.options.getString("seller"), inline: true },
      { name: "👤 Buyer", value: interaction.user.toString(), inline: true },
      { name: "📦 Produk", value: interaction.options.getString("produk") },
      { name: "💰 Harga", value: interaction.options.getString("harga") },
      {
        name: "⭐ Rating",
        value: "⭐".repeat(interaction.options.getInteger("rating"))
      },
      { name: "💬 Komentar", value: interaction.options.getString("komentar") }
    )
    .setFooter({ text: `ID: ${interaction.user.id}` })
    .setTimestamp();

  const channel = interaction.guild.channels.cache.get(config.feedbackChannelId);
  if (!channel) {
    return interaction.reply({
      content: "❌ Channel feedback tidak ditemukan.",
      ephemeral: true
    });
  }

  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: "✅ Feedback berhasil dikirim. Terima kasih!",
    ephemeral: true
  });
}

    //TESTIMONI
if (interaction.commandName === "testimoni") {
  if (!interaction.member.roles.cache.has(config.sellerRoleId)) {
    return interaction.reply({
      content: "❌ Hanya **Seller** yang bisa mengirim testimoni.",
      ephemeral: true
    });
  }
  
  const foto = interaction.options.getAttachment("foto");

  const embed = new EmbedBuilder()
    .setTitle("🧾 Testimoni Transaksi")
    .setColor("Green")
    .addFields(
      { name: "📌 Transaksi Ke", value: interaction.options.getString("ke") },
      { name: "🛒 Penjual", value: interaction.options.getString("penjual"), inline: true },
      { name: "👤 Pembeli", value: interaction.options.getString("pembeli"), inline: true },
      { name: "📦 Produk", value: interaction.options.getString("produk") },
      { name: "💰 Harga", value: interaction.options.getString("harga"), inline: true },
      { name: "💳 Pembayaran", value: interaction.options.getString("pembayaran"), inline: true },
      { name: "📊 Status", value: interaction.options.getString("status") }
    )
    .setFooter({ text: `Dikirim oleh ${interaction.user.tag}` })
    .setTimestamp();

  // JIKA ADA FOTO → TAMPILKAN DI BAWAH
  if (foto) {
    embed.setImage(foto.url);
  }

  const channel = interaction.guild.channels.cache.get(config.testimoniChannelId);
  if (!channel) {
    return interaction.reply({
      content: "❌ Channel testimoni tidak ditemukan.",
      ephemeral: true
    });
  }

  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: "✅ Testimoni berhasil dikirim.",
    ephemeral: true
  });
}

  // STORE
if (interaction.commandName === "store") {

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({
      content: "❌ Command ini hanya untuk Admin.",
      ephemeral: true
    });
  }

  const status = interaction.options.getString("status");

  // ⚠️ PENTING: URL di bawah ini adalah SIGNED CDN URL Discord (ada param ex=/is=/hm=).
  // URL kayak gini PUNYA MASA BERLAKU (biasanya ~24 jam) dan akan otomatis expired/broken.
  // Solusi permanen: upload gambar ini sebagai attachment di channel private bot,
  // lalu pakai message.attachments.first().url yang di-fetch ulang tiap kali dipakai,
  // ATAU host di layanan permanen (imgur, cdn sendiri, dll).
  const openBanner =
    "https://cdn.discordapp.com/attachments/1458006428425130004/1468556813644333056/Picsart_26-02-04_17-38-43-241.jpg?ex=6984739c&is=6983221c&hm=3f43764f217ff631088909ccb15506053f0f02a9b99cac7dcc776c29813c528f&";

  const closeBanner =
    "https://cdn.discordapp.com/attachments/1458006428425130004/1468556824331554866/Picsart_26-02-04_17-39-36-030.jpg?ex=6984739f&is=6983221f&hm=26c6c9ddb5ffe17694ce0b10bb43fae47900a76483df84a8676b75124240f692&";

  const embed =
    status === "open"
      ? new EmbedBuilder()
          .setTitle("🟢 Ahmad Store OPEN")
          .setColor("Green")
          .setDescription(
            "**Ahmad Store resmi dibuka kembali!** 🎉\n\n" +
              "🗺️ **Layanan**\n" +
              "• Hosting\n" +
              "• RDP & VPS\n" +
              "• Semua Jasa Digital\n\n" +
              "⚡ **Status Owner**\n" +
              "Online ✅\n\n" +
              "🛡️ **Tips Order**\n" +
              "Pastikan membaca rules dan daftar harga sebelum order.\n\n" +
              "Terima kasih atas kepercayaan kalian 🙏"
          )
          .setImage(openBanner)
      : new EmbedBuilder()
          .setTitle("⚠️ Ahmad Store CLOSED ⚠️")
          .setColor("Red")
          .setDescription(
            "**Ahmad Store saat ini sedang tutup.**\n\n" +
              "🗺️ **Layanan**\n" +
              "Sementara tidak tersedia.\n\n" +
              "⚡ **Status Owner**\n" +
              "Online ✅\n\n" +
              "🛡️ **Informasi**\n" +
              "Jika ingin menggunakan jasa, silakan **buat ticket** dan tunggu admin memberikan respon.\n\n" +
              "Terima kasih atas pengertiannya 🙏"
          )
          .setImage(closeBanner);

  await interaction.channel.send({
    content: "@everyone",
    embeds: [embed.setTimestamp()],
  });

  await interaction.reply({
    content: "✅ Status store berhasil dikirim!",
    ephemeral: true,
  });
}

//EXPIRED
if (interaction.commandName === "expired") {

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({
      content: "❌ Command ini hanya untuk Admin.",
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🔧 DETAIL HOSTING")
    .setColor("Orange")
    .setDescription(
      `• Hosting : ${interaction.options.getString("hosting")}\n` +
      `• Buyer   : ${interaction.options.getString("buyer")}\n` +
      `• Expired : ${interaction.options.getString("expired")}\n\n` +
      `📌 Catatan:\nHarap perpanjang minimal 5 hari sebelum masa expired.`
    )
    .setFooter({ text: `Dikirim oleh ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.channel.send({ embeds: [embed] });

  await interaction.reply({
    content: "✅ Detail expired berhasil dikirim.",
    ephemeral: true
  });
}

// SENDHOSTING
if (interaction.commandName === "sendhosting") {

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({
      content: "❌ Command ini hanya untuk Admin.",
      ephemeral: true
    });
  }

  const buyer = interaction.options.getUser("buyer");
  const username = interaction.options.getString("username");
  const password = interaction.options.getString("password");

  /* ================= DM EMBED ================= */

  const dmEmbed = new EmbedBuilder()
    .setTitle("📦 PESANAN HOSTING — AHMAD STORE")
    .setColor("Green")
    .setDescription(
      `Halo ${buyer}, berikut detail hosting Anda:\n\n` +
      `🔹 **Panel Hosting**\n` +
      `🌐 https://network.mifuyu-yukino.biz.id/\n\n` +
      `🔹 **phpMyAdmin**\n` +
      `🗄️ https://pma.mifuyu-yukino.biz.id/\n\n` +
      `🔹 **Login Detail**\n` +
      `👤 Username: \`${username}\`\n` +
      `🔑 Password: \`${password}\`\n\n` +
      `⚠️ **NOTE:**\n` +
      `Silakan berikan feedback setelah penggunaan untuk melakukan claim garansi.\n\n` +
      `Terima kasih telah menggunakan layanan kami 🙏`
    )
    .setFooter({ text: "Ahmad Store • Hosting Service" })
    .setTimestamp();

  try {
    await buyer.send({ embeds: [dmEmbed] });
  } catch {
    return interaction.reply({
      content: "❌ Gagal mengirim DM ke buyer. Pastikan DM terbuka.",
      ephemeral: true
    });
  }

/* ================= LOG EMBED ================= */

const logEmbed = new EmbedBuilder()
  .setTitle("📤 HOSTING BERHASIL DIKIRIM")
  .setColor("Blue")
  .addFields(
    { name: "👤 Buyer", value: `${buyer.tag}`, inline: true },
    { name: "🛒 Admin", value: `${interaction.user.tag}`, inline: true },
    { name: "📦 Username", value: username, inline: true }
  )
  .setFooter({ text: "Ahmad Store • Sendpanel Log" })
  .setTimestamp();

const logChannel = interaction.guild.channels.cache.get(config.sendpanelLogChannelId);

if (logChannel) {
  logChannel.send({ embeds: [logEmbed] });
}

await interaction.reply({
  content: "✅ Hosting berhasil dikirim.",
  ephemeral: true
});

}

/* ===== PAYMENT ===== */

if (interaction.commandName === "payment") {

    const embed = new EmbedBuilder()
      .setTitle("💳 Metode Pembayaran - Ahmad Store")
      .setColor(0x00FF00)
      .setDescription(
        [
          "Silakan pilih metode pembayaran:",
          "",
          "💚 DANA",
          "💙 GoPay",
          "💜 QRIS",
          "",
          "Klik tombol di bawah."
        ].join("\n")
      )
      .setImage("https://cdn.discordapp.com/attachments/1459063987894358017/1475039553864601610/Ahmad_merayakan_Ramadhan_dengan_ceria.png")
      .setFooter({ text: "Ahmad Store • Trusted Seller" })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("pay_dana")
          .setLabel("DANA")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("pay_gopay")
          .setLabel("GoPay")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("pay_qris")
          .setLabel("QRIS")
          .setStyle(ButtonStyle.Success)
      );

    return interaction.reply({
      embeds: [embed],
      components: [row],
    });

  } // ✅ tutup IF

/* ===== TICKET PANEL ===== */

if (interaction.commandName === "ticketpanel") {

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket Support — Ahmad Store")
    .setColor("Blue")
    .setDescription(
      "Ada kendala atau ingin komplain?\n\n" +
      "Klik tombol di bawah untuk membuka ticket. Nanti akan dibuatkan channel privat khusus buat kamu dan tim support."
    )
    .setFooter({ text: "Ahmad Store • Ticket System" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("Buka Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Success)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
  });

} // ✅ tutup IF

 } catch (err) {
  console.error("❌ Error saat memproses interaction:", err);
  // Kasih tahu user biar gak liat "This interaction failed" doang tanpa penjelasan
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "❌ Terjadi kesalahan saat memproses perintah.", ephemeral: true });
    } else {
      await interaction.reply({ content: "❌ Terjadi kesalahan saat memproses perintah.", ephemeral: true });
    }
  } catch {}
 }

}); // ✅ tutup interactionCreate (INI SERING LUPA)

/* ================= LOGIN ================= */

client.login(config.token);
