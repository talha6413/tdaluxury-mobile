import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import {
  CalendarDays, ChevronRight, CircleDollarSign, Clock3, Home, LogIn,
  PackageCheck, Plus, Search, Settings, Sparkles, UserRound, UsersRound,
  WalletCards,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "./src/theme";
import { isSupabaseReady, supabase } from "./src/lib/supabase";

type Role = "customer" | "staff" | "admin";
type Tab = "home" | "appointments" | "customers" | "finance" | "profile";
type Customer = { id: string; full_name: string; phone: string; email: string; notes: string; active: boolean };
type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
type LiveAppointment = { id: string; starts_at: string; ends_at: string; status: AppointmentStatus; notes: string; customers: { full_name: string } | null };
type PaymentMethod = "cash" | "card" | "transfer" | "other";
type LivePayment = { id: string; amount: number; method: PaymentMethod; paid_at: string; notes: string; customers: { full_name: string } | null };

const appointments = [
  { time: "10:00", name: "Elif Yılmaz", service: "Lazer Epilasyon", status: "Onaylandı" },
  { time: "11:30", name: "Zeynep Kaya", service: "Hydrafacial", status: "Bekliyor" },
  { time: "13:00", name: "Derya Aydın", service: "Kirpik Lifting", status: "Onaylandı" },
  { time: "15:30", name: "Merve Arslan", service: "Kalıcı Makyaj", status: "Onaylandı" },
];

const roleLabels: Record<Role, string> = { customer: "Müşteri", staff: "Personel", admin: "Yönetici" };

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [tab, setTab] = useState<Tab>("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("Talha");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      await loadMember(user.id);
      setSignedIn(true);
    });
  }, []);

  async function loadMember(userId: string) {
    if (!supabase) return;
    const { data } = await supabase.from("app_members").select("role,full_name,active").eq("user_id", userId).maybeSingle();
    if (data?.active) {
      setRole(data.role as Role);
      setDisplayName(data.full_name || "TDA Kullanıcısı");
    }
  }

  async function signIn() {
    if (!email || !password) return setMessage("E-posta ve şifrenizi girin.");
    if (!supabase) {
      setSignedIn(true);
      setMessage("");
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMessage("Giriş bilgileri doğrulanamadı.");
    if (data.user) await loadMember(data.user.id);
    setSignedIn(true);
  }

  if (!signedIn) return <Login email={email} password={password} message={message} setEmail={setEmail} setPassword={setPassword} signIn={signIn} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.app}>
        <Header role={role} displayName={displayName} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === "home" && <Dashboard role={role} navigate={setTab} />}
          {tab === "appointments" && <Appointments />}
          {tab === "customers" && <Customers />}
          {tab === "finance" && <Finance />}
          {tab === "profile" && <Profile role={role} signOut={async () => { await supabase?.auth.signOut(); setSignedIn(false); }} />}
        </ScrollView>
        <TabBar role={role} active={tab} setTab={setTab} />
      </View>
    </SafeAreaView>
  );
}

function Login({ email, password, message, setEmail, setPassword, signIn }: { email: string; password: string; message: string; setEmail: (v: string) => void; setPassword: (v: string) => void; signIn: () => void }) {
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><View style={styles.login}>
    <View style={styles.logo}><Text style={styles.logoMain}>TDA</Text><Text style={styles.logoSub}>LUXURY</Text></View>
    <View><Text style={styles.kicker}>TEK UYGULAMA · TAM KONTROL</Text><Text style={styles.loginTitle}>Tekrar hoş geldiniz.</Text><Text style={styles.loginText}>Randevularınıza, paketlerinize ve işletme yönetimine güvenle erişin.</Text></View>
    <View style={styles.form}>
      <Text style={styles.inputLabel}>E-posta adresi</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ornek@tdaluxury.com" placeholderTextColor="#625B53" autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.inputLabel}>Şifre</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#625B53" secureTextEntry />
      {!!message && <Text style={styles.error}>{message}</Text>}
      <TouchableOpacity style={styles.primaryButton} onPress={signIn}><LogIn color={colors.background} size={19} /><Text style={styles.primaryButtonText}>GİRİŞ YAP</Text></TouchableOpacity>
      {!isSupabaseReady && <Text style={styles.demo}>Geliştirme önizlemesi: herhangi bir e-posta ve şifreyle açılır.</Text>}
    </View>
    <Text style={styles.secure}>Güvenli erişim · TDA Luxury Uşak</Text>
  </View></SafeAreaView>;
}

function Header({ role, displayName }: { role: Role; displayName: string }) {
  return <View style={styles.header}><View><Text style={styles.headerEyebrow}>TDA LUXURY</Text><Text style={styles.headerTitle}>İyi günler, {displayName}</Text></View><View style={styles.roleChip}><Sparkles size={14} color={colors.gold} /><Text style={styles.roleText}>{roleLabels[role]}</Text></View></View>;
}

function Dashboard({ role, navigate }: { role: Role; navigate: (t: Tab) => void }) {
  const metrics = role === "customer" ? [["2", "Aktif Paket"], ["7", "Kalan Seans"], ["24 Tem", "Sıradaki Randevu"]] : [["12", "Bugünkü Randevu"], ["₺18.450", "Günlük Tahsilat"], ["4", "Bekleyen İşlem"]];
  return <>
    <View style={styles.heroCard}><View><Text style={styles.heroKicker}>{role === "customer" ? "BAKIM YOLCULUĞUNUZ" : "BUGÜNÜN ÖZETİ"}</Text><Text style={styles.heroTitle}>{role === "customer" ? "Kendinize ayırdığınız zamanı yönetin." : "Salonunuz kontrol altında."}</Text><Text style={styles.heroText}>{role === "customer" ? "Paketlerinizi, seanslarınızı ve randevularınızı tek ekrandan takip edin." : "Günün akışını, tahsilatları ve müşteri hareketlerini izleyin."}</Text></View><TouchableOpacity style={styles.heroAction} onPress={() => navigate("appointments")}><CalendarDays size={18} color={colors.background} /><Text style={styles.heroActionText}>{role === "customer" ? "RANDEVU AL" : "TAKVİMİ AÇ"}</Text></TouchableOpacity></View>
    <View style={styles.metricGrid}>{metrics.map(([value, label]) => <View style={styles.metric} key={label}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
    <SectionTitle title={role === "customer" ? "Paketlerim" : "Sıradaki randevular"} action="Tümünü gör" />
    {role === "customer" ? <PackageCard /> : appointments.slice(0, 3).map((item) => <AppointmentRow key={item.time} item={item} />)}
    <SectionTitle title="Hızlı işlemler" />
    <View style={styles.quickGrid}><Quick icon={CalendarDays} label="Randevu" onPress={() => navigate("appointments")} /><Quick icon={UsersRound} label="Müşteriler" onPress={() => navigate("customers")} /><Quick icon={WalletCards} label="Tahsilat" onPress={() => navigate("finance")} /><Quick icon={Plus} label="Yeni işlem" /></View>
  </>;
}

function Appointments() {
  const [items, setItems] = useState<LiveAppointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [service, setService] = useState("");
  const [formError, setFormError] = useState("");

  async function loadAppointments() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const [appointmentResult, customerResult] = await Promise.all([
      supabase.from("appointments").select("id,starts_at,ends_at,status,notes,customers(full_name)").gte("starts_at", from.toISOString()).order("starts_at").limit(100),
      supabase.from("customers").select("id,full_name,phone,email,notes,active").eq("active", true).order("full_name"),
    ]);
    setLoading(false);
    if (appointmentResult.error) { Alert.alert("Randevular yüklenemedi", appointmentResult.error.message); return; }
    setItems((appointmentResult.data ?? []) as unknown as LiveAppointment[]);
    setCustomers((customerResult.data ?? []) as Customer[]);
  }

  useEffect(() => { void loadAppointments(); }, []);

  async function saveAppointment() {
    if (!supabase) { setFormError("Supabase bağlantısı hazır değil."); return; }
    if (!selectedCustomer || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) { setFormError("Müşteri, tarih ve saati eksiksiz girin."); return; }
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 480) { setFormError("Süre 15-480 dakika arasında olmalıdır."); return; }
    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) { setFormError("Tarih veya saat geçersiz."); return; }
    const endsAt = new Date(startsAt.getTime() + minutes * 60000);
    setSaving(true); setFormError("");
    const { error } = await supabase.from("appointments").insert({ customer_id: selectedCustomer, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: "pending", notes: service.trim() });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setService(""); setShowForm(false); setSelectedCustomer("");
    await loadAppointments();
    Alert.alert("Randevu oluşturuldu", "Randevu takvime başarıyla eklendi.");
  }

  const statusLabel: Record<AppointmentStatus, string> = { pending: "Bekliyor", confirmed: "Onaylandı", completed: "Tamamlandı", cancelled: "İptal", no_show: "Gelmedi" };
  return <>
    <PageTitle title="Randevular" subtitle={`${items.length} yaklaşan randevu`} action={showForm ? "Formu kapat" : "Yeni randevu"} onAction={() => { setFormError(""); setShowForm(value => !value); }} />
    {showForm && <View style={styles.customerForm}>
      <Text style={styles.formTitle}>Yeni randevu</Text>
      <Text style={styles.inputLabel}>Müşteri *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.choiceScroll}>{customers.map(customer => <TouchableOpacity key={customer.id} style={[styles.choice, selectedCustomer === customer.id && styles.choiceActive]} onPress={() => setSelectedCustomer(customer.id)}><Text style={[styles.choiceText, selectedCustomer === customer.id && styles.choiceTextActive]}>{customer.full_name}</Text></TouchableOpacity>)}</ScrollView>
      {customers.length === 0 && <Text style={styles.emptyText}>Önce müşteri kaydı oluşturmalısınız.</Text>}
      <View style={styles.formRow}><View style={styles.formHalf}><Text style={styles.inputLabel}>Tarih *</Text><TextInput value={date} onChangeText={setDate} placeholder="2026-07-20" placeholderTextColor={colors.muted} style={styles.formField} /></View><View style={styles.formHalf}><Text style={styles.inputLabel}>Saat *</Text><TextInput value={time} onChangeText={setTime} placeholder="10:00" placeholderTextColor={colors.muted} style={styles.formField} /></View></View>
      <Text style={styles.inputLabel}>Süre (dakika)</Text><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="60" placeholderTextColor={colors.muted} style={styles.formField} />
      <Text style={styles.inputLabel}>İşlem / not</Text><TextInput value={service} onChangeText={setService} placeholder="Örn. Lazer epilasyon · Tüm vücut" placeholderTextColor={colors.muted} style={styles.formField} />
      {!!formError && <Text style={styles.error}>{formError}</Text>}
      <TouchableOpacity style={styles.primaryButton} onPress={() => void saveAppointment()} disabled={saving}>{saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>RANDEVUYU KAYDET</Text>}</TouchableOpacity>
    </View>}
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.gold} /><Text style={styles.emptyText}>Randevular yükleniyor…</Text></View> : items.length === 0 ? <View style={styles.emptyState}><CalendarDays color={colors.gold} size={30} /><Text style={styles.emptyTitle}>Yaklaşan randevu yok</Text><Text style={styles.emptyText}>Yeni randevu düğmesiyle takvime kayıt ekleyebilirsiniz.</Text></View> : items.map(item => { const start = new Date(item.starts_at); return <View style={styles.appointment} key={item.id}><View style={styles.time}><Text style={styles.timeText}>{start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</Text><Text style={styles.dateMini}>{start.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}</Text></View><View style={styles.grow}><Text style={styles.rowTitle}>{item.customers?.full_name ?? "Müşteri"}</Text><Text style={styles.rowSub}>{item.notes || "İşlem bilgisi girilmedi"}</Text></View><Text style={[styles.status, (item.status === "cancelled" || item.status === "no_show") && styles.statusDanger]}>{statusLabel[item.status]}</Text></View>; })}
  </>;
}

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  async function loadCustomers() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("customers").select("id,full_name,phone,email,notes,active").eq("active", true).order("full_name");
    setLoading(false);
    if (error) { Alert.alert("Müşteriler yüklenemedi", error.message); return; }
    setCustomers((data ?? []) as Customer[]);
  }

  useEffect(() => { void loadCustomers(); }, []);

  async function saveCustomer() {
    if (!supabase) { setFormError("Supabase bağlantısı hazır değil."); return; }
    const name = fullName.trim();
    const mobile = phone.trim();
    if (!name || !mobile) { setFormError("Ad soyad ve telefon zorunludur."); return; }
    setSaving(true); setFormError("");
    const { data, error } = await supabase.from("customers").insert({ full_name: name, phone: mobile, email: email.trim(), notes: notes.trim() }).select("id,full_name,phone,email,notes,active").single();
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setCustomers(current => [...current, data as Customer].sort((a, b) => a.full_name.localeCompare(b.full_name, "tr")));
    setFullName(""); setPhone(""); setEmail(""); setNotes(""); setShowForm(false);
    Alert.alert("Müşteri kaydedildi", `${name} müşteri listenize eklendi.`);
  }

  const filtered = customers.filter(customer => `${customer.full_name} ${customer.phone}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr").trim()));
  const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("tr");

  return <>
    <PageTitle title="Müşteriler" subtitle={`${customers.length} aktif kayıt`} action={showForm ? "Formu kapat" : "Yeni müşteri"} onAction={() => { setFormError(""); setShowForm(value => !value); }} />
    {showForm && <View style={styles.customerForm}>
      <Text style={styles.formTitle}>Yeni müşteri kartı</Text>
      <Text style={styles.inputLabel}>Ad soyad *</Text><TextInput value={fullName} onChangeText={setFullName} placeholder="Örn. Defne Dayan" placeholderTextColor={colors.muted} style={styles.formField} autoCapitalize="words" />
      <Text style={styles.inputLabel}>Telefon *</Text><TextInput value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" placeholderTextColor={colors.muted} style={styles.formField} keyboardType="phone-pad" />
      <Text style={styles.inputLabel}>E-posta</Text><TextInput value={email} onChangeText={setEmail} placeholder="musteri@eposta.com" placeholderTextColor={colors.muted} style={styles.formField} keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.inputLabel}>Not</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Tercihler veya kısa not" placeholderTextColor={colors.muted} style={[styles.formField, styles.notesField]} multiline />
      {!!formError && <Text style={styles.error}>{formError}</Text>}
      <TouchableOpacity style={styles.primaryButton} onPress={() => void saveCustomer()} disabled={saving}>{saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>MÜŞTERİYİ KAYDET</Text>}</TouchableOpacity>
    </View>}
    <View style={styles.search}><Search size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="İsim veya telefon ara" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.gold} /><Text style={styles.emptyText}>Müşteriler yükleniyor…</Text></View> : filtered.length === 0 ? <View style={styles.emptyState}><UsersRound color={colors.gold} size={30} /><Text style={styles.emptyTitle}>{query ? "Eşleşen müşteri yok" : "İlk müşterinizi ekleyin"}</Text><Text style={styles.emptyText}>{query ? "Arama ifadesini değiştirin." : "Yeni müşteri düğmesiyle gerçek müşteri kaydı oluşturabilirsiniz."}</Text></View> : filtered.map(customer => <TouchableOpacity style={styles.customer} key={customer.id}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(customer.full_name)}</Text></View><View style={styles.grow}><Text style={styles.rowTitle}>{customer.full_name}</Text><Text style={styles.rowSub}>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</Text></View><ChevronRight color={colors.muted} size={19} /></TouchableOpacity>)}
  </>;
}

function Finance() {
  const [payments, setPayments] = useState<LivePayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  async function loadFinance() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [paymentResult, customerResult] = await Promise.all([
      supabase.from("payments").select("id,amount,method,paid_at,notes,customers(full_name)").gte("paid_at", today.toISOString()).order("paid_at", { ascending: false }).limit(100),
      supabase.from("customers").select("id,full_name,phone,email,notes,active").eq("active", true).order("full_name"),
    ]);
    setLoading(false);
    if (paymentResult.error) { Alert.alert("Kasa yüklenemedi", paymentResult.error.message); return; }
    setPayments((paymentResult.data ?? []) as unknown as LivePayment[]);
    setCustomers((customerResult.data ?? []) as Customer[]);
  }

  useEffect(() => { void loadFinance(); }, []);

  async function savePayment() {
    if (!supabase) { setFormError("Supabase bağlantısı hazır değil."); return; }
    const numericAmount = Number(amount.replace(",", "."));
    if (!selectedCustomer || !Number.isFinite(numericAmount) || numericAmount <= 0) { setFormError("Müşteri ve geçerli tahsilat tutarı zorunludur."); return; }
    setSaving(true); setFormError("");
    const { error } = await supabase.from("payments").insert({ customer_id: selectedCustomer, amount: numericAmount, method, notes: notes.trim() });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setAmount(""); setNotes(""); setSelectedCustomer(""); setShowForm(false);
    await loadFinance();
    Alert.alert("Tahsilat kaydedildi", `${formatMoney(numericAmount)} kasa hareketlerine eklendi.`);
  }

  const total = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const cash = payments.filter(payment => payment.method === "cash").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const card = payments.filter(payment => payment.method === "card").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const transfer = payments.filter(payment => payment.method === "transfer").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const methodLabels: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", transfer: "Havale", other: "Diğer" };

  return <>
    <PageTitle title="Kasa & Finans" subtitle="Bugünkü canlı tahsilatlar" action={showForm ? "Formu kapat" : "Tahsilat ekle"} onAction={() => { setFormError(""); setShowForm(value => !value); }} />
    {showForm && <View style={styles.customerForm}>
      <Text style={styles.formTitle}>Yeni tahsilat</Text>
      <Text style={styles.inputLabel}>Müşteri *</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.choiceScroll}>{customers.map(customer => <TouchableOpacity key={customer.id} style={[styles.choice, selectedCustomer === customer.id && styles.choiceActive]} onPress={() => setSelectedCustomer(customer.id)}><Text style={[styles.choiceText, selectedCustomer === customer.id && styles.choiceTextActive]}>{customer.full_name}</Text></TouchableOpacity>)}</ScrollView>
      <Text style={styles.inputLabel}>Tutar (₺) *</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="2500" placeholderTextColor={colors.muted} style={styles.formField} />
      <Text style={styles.inputLabel}>Ödeme yöntemi</Text><View style={styles.methodGrid}>{(["cash", "card", "transfer", "other"] as PaymentMethod[]).map(value => <TouchableOpacity key={value} style={[styles.methodChoice, method === value && styles.choiceActive]} onPress={() => setMethod(value)}><Text style={[styles.choiceText, method === value && styles.choiceTextActive]}>{methodLabels[value]}</Text></TouchableOpacity>)}</View>
      <Text style={styles.inputLabel}>Açıklama</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Örn. Lazer paket taksiti" placeholderTextColor={colors.muted} style={styles.formField} />
      {!!formError && <Text style={styles.error}>{formError}</Text>}
      <TouchableOpacity style={styles.primaryButton} onPress={() => void savePayment()} disabled={saving}>{saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>TAHSİLATI KAYDET</Text>}</TouchableOpacity>
    </View>}
    <View style={styles.balance}><Text style={styles.balanceLabel}>BUGÜNKÜ TAHSİLAT</Text><Text style={styles.balanceValue}>{formatMoney(total)}</Text><Text style={styles.balanceHint}>{payments.length} ödeme hareketi</Text></View>
    <View style={styles.metricGrid}><View style={styles.metric}><Text style={styles.metricValue}>{formatMoney(cash)}</Text><Text style={styles.metricLabel}>Nakit</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{formatMoney(card)}</Text><Text style={styles.metricLabel}>Kart</Text></View><View style={styles.metric}><Text style={styles.metricValue}>{formatMoney(transfer)}</Text><Text style={styles.metricLabel}>Havale</Text></View></View>
    <SectionTitle title="Bugünkü hareketler" />
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.gold} /></View> : payments.length === 0 ? <View style={styles.emptyState}><WalletCards color={colors.gold} size={30} /><Text style={styles.emptyTitle}>Bugün tahsilat yok</Text><Text style={styles.emptyText}>İlk ödemeyi tahsilat ekle düğmesiyle kaydedebilirsiniz.</Text></View> : payments.map(payment => <View style={styles.transaction} key={payment.id}><View style={styles.transactionIcon}><CircleDollarSign size={19} color={colors.gold} /></View><View style={styles.grow}><Text style={styles.rowTitle}>{payment.customers?.full_name ?? "Müşteri"}</Text><Text style={styles.rowSub}>{methodLabels[payment.method]} · {payment.notes || new Date(payment.paid_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</Text></View><Text style={styles.amount}>+{formatMoney(Number(payment.amount))}</Text></View>)}
  </>;
}

function formatMoney(value: number) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }

function Profile({ role, signOut }: { role: Role; signOut: () => void }) { return <><PageTitle title="Hesabım" subtitle={`${roleLabels[role]} hesabı`} /><View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitial}>T</Text></View><Text style={styles.profileName}>Talha</Text><Text style={styles.rowSub}>talha6413@gmail.com</Text></View>{["Bildirim ayarları", "Yetkiler ve personel", "İşletme ayarları", "Güvenlik", "Yardım ve destek"].map(x => <TouchableOpacity style={styles.setting} key={x}><Settings size={18} color={colors.gold} /><Text style={styles.settingText}>{x}</Text><ChevronRight size={18} color={colors.muted} /></TouchableOpacity>)}<TouchableOpacity style={styles.logout} onPress={signOut}><Text style={styles.logoutText}>Güvenli çıkış yap</Text></TouchableOpacity></>; }

function PageTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <View style={styles.pageTitle}><View><Text style={styles.pageHeading}>{title}</Text><Text style={styles.pageSubtitle}>{subtitle}</Text></View>{action && <TouchableOpacity style={styles.smallButton} onPress={onAction}><Plus size={15} color={colors.background} /><Text style={styles.smallButtonText}>{action}</Text></TouchableOpacity>}</View>; }
function SectionTitle({ title, action }: { title: string; action?: string }) { return <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>{title}</Text>{action && <Text style={styles.sectionAction}>{action}</Text>}</View>; }
function AppointmentRow({ item }: { item: typeof appointments[number] }) { return <TouchableOpacity style={styles.appointment}><View style={styles.time}><Text style={styles.timeText}>{item.time}</Text><Clock3 size={14} color={colors.gold} /></View><View style={styles.grow}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowSub}>{item.service}</Text></View><View><Text style={styles.status}>{item.status}</Text><ChevronRight size={18} color={colors.muted} style={styles.chevron} /></View></TouchableOpacity>; }
function PackageCard() { return <View style={styles.packageCard}><View style={styles.packageIcon}><PackageCheck color={colors.gold} /></View><View style={styles.grow}><Text style={styles.rowTitle}>Tüm Vücut Lazer</Text><Text style={styles.rowSub}>8 seans paket · 3 seans kullanıldı</Text><View style={styles.progress}><View style={styles.progressFill} /></View></View><Text style={styles.packageCount}>5<Text style={styles.packageSmall}> seans</Text></Text></View>; }
function Quick({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress?: () => void }) { return <TouchableOpacity style={styles.quick} onPress={onPress}><View style={styles.quickIcon}><Icon size={21} color={colors.gold} /></View><Text style={styles.quickText}>{label}</Text></TouchableOpacity>; }

function TabBar({ role, active, setTab }: { role: Role; active: Tab; setTab: (t: Tab) => void }) { const items = useMemo(() => role === "customer" ? [["home", Home, "Ana Sayfa"], ["appointments", CalendarDays, "Randevu"], ["finance", PackageCheck, "Paketler"], ["profile", UserRound, "Hesabım"]] as const : [["home", Home, "Özet"], ["appointments", CalendarDays, "Takvim"], ["customers", UsersRound, "Müşteriler"], ["finance", WalletCards, "Kasa"], ["profile", UserRound, "Hesabım"]] as const, [role]); return <View style={styles.tabs}>{items.map(([id, Icon, label]) => <TouchableOpacity style={styles.tab} key={id} onPress={() => setTab(id)}><Icon size={21} color={active === id ? colors.goldSoft : colors.muted} /><Text style={[styles.tabText, active === id && styles.tabActive]}>{label}</Text></TouchableOpacity>)}</View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, app: { flex: 1 }, content: { padding: 18, paddingBottom: 110 },
  login: { flex: 1, padding: 26, justifyContent: "space-between" }, logo: { alignItems: "center", marginTop: 20 }, logoMain: { color: colors.goldSoft, fontSize: 42, fontWeight: "300", letterSpacing: 13 }, logoSub: { color: colors.text, fontSize: 11, letterSpacing: 8, marginLeft: 5 }, kicker: { color: colors.gold, fontSize: 11, letterSpacing: 2, marginBottom: 14 }, loginTitle: { color: colors.text, fontSize: 34, fontWeight: "600" }, loginText: { color: colors.muted, lineHeight: 22, marginTop: 10, maxWidth: 340 }, form: { gap: 9 }, inputLabel: { color: colors.text, fontSize: 13, marginTop: 8 }, input: { height: 55, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 17, color: colors.text }, primaryButton: { height: 56, backgroundColor: colors.goldSoft, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, marginTop: 13 }, primaryButtonText: { color: colors.background, fontWeight: "800", letterSpacing: 1 }, error: { color: colors.danger, fontSize: 13 }, demo: { color: colors.muted, textAlign: "center", fontSize: 11 }, secure: { color: colors.muted, textAlign: "center", fontSize: 12 },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerEyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 2 }, headerTitle: { color: colors.text, fontSize: 21, fontWeight: "600", marginTop: 3 }, roleChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#4A3D2B", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 }, roleText: { color: colors.goldSoft, fontSize: 12, fontWeight: "600" },
  heroCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: "#403520", borderRadius: 24, padding: 22, gap: 23 }, heroKicker: { color: colors.gold, fontSize: 10, letterSpacing: 2 }, heroTitle: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: "600", marginTop: 9 }, heroText: { color: colors.muted, lineHeight: 21, marginTop: 8 }, heroAction: { alignSelf: "flex-start", backgroundColor: colors.goldSoft, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center" }, heroActionText: { color: colors.background, fontWeight: "800", fontSize: 12 }, metricGrid: { flexDirection: "row", gap: 9, marginTop: 13 }, metric: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 14 }, metricValue: { color: colors.text, fontWeight: "700", fontSize: 19 }, metricLabel: { color: colors.muted, fontSize: 10, marginTop: 5 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 25, marginBottom: 11 }, sectionHeading: { color: colors.text, fontSize: 19, fontWeight: "600" }, sectionAction: { color: colors.gold, fontSize: 12 }, appointment: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, padding: 14 }, time: { width: 54, alignItems: "center", gap: 4 }, timeText: { color: colors.goldSoft, fontWeight: "700" }, grow: { flex: 1 }, rowTitle: { color: colors.text, fontWeight: "600", fontSize: 14 }, rowSub: { color: colors.muted, fontSize: 12, marginTop: 4 }, status: { color: colors.success, fontSize: 9 }, chevron: { alignSelf: "flex-end", marginTop: 5 }, quickGrid: { flexDirection: "row", gap: 8 }, quick: { flex: 1, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center", gap: 8 }, quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#221D16", alignItems: "center", justifyContent: "center" }, quickText: { color: colors.text, fontSize: 10 }, packageCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16 }, packageIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#241E16", alignItems: "center", justifyContent: "center" }, progress: { height: 4, backgroundColor: colors.line, borderRadius: 2, marginTop: 11 }, progressFill: { width: "38%", height: 4, backgroundColor: colors.gold, borderRadius: 2 }, packageCount: { color: colors.goldSoft, fontSize: 22, fontWeight: "700" }, packageSmall: { fontSize: 9, color: colors.muted },
  pageTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, pageHeading: { color: colors.text, fontSize: 27, fontWeight: "700" }, pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 }, smallButton: { backgroundColor: colors.goldSoft, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 11, flexDirection: "row", gap: 5, alignItems: "center" }, smallButtonText: { color: colors.background, fontWeight: "700", fontSize: 10 }, search: { height: 49, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 12 }, searchInput: { flex: 1, color: colors.text, paddingHorizontal: 10 }, customer: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }, avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#2A2118", alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.goldSoft, fontWeight: "700" },
  customerForm: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginBottom: 14 }, formTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 7 }, formField: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 14, marginTop: 6 }, notesField: { minHeight: 72, paddingTop: 13, textAlignVertical: "top" }, loading: { alignItems: "center", gap: 12, paddingVertical: 40 }, emptyState: { alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 28, marginTop: 8 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700" }, emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  choiceScroll: { marginTop: 8, marginBottom: 4 }, choice: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, marginRight: 8 }, choiceActive: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft }, choiceText: { color: colors.text, fontSize: 12 }, choiceTextActive: { color: colors.background, fontWeight: "700" }, formRow: { flexDirection: "row", gap: 9 }, formHalf: { flex: 1 }, dateMini: { color: colors.muted, fontSize: 9 }, statusDanger: { color: colors.danger },
  methodGrid: { flexDirection: "row", gap: 7, marginTop: 7 }, methodChoice: { flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  balance: { backgroundColor: colors.goldSoft, borderRadius: 22, padding: 22 }, balanceLabel: { color: "#4B3B26", fontSize: 10, letterSpacing: 2 }, balanceValue: { color: colors.background, fontSize: 35, fontWeight: "800", marginTop: 8 }, balanceHint: { color: "#59482F", marginTop: 5, fontSize: 12 }, transaction: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 11 }, transactionIcon: { width: 39, height: 39, backgroundColor: colors.surface, borderRadius: 12, alignItems: "center", justifyContent: "center" }, amount: { color: colors.success, fontWeight: "700" }, negative: { color: colors.danger },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginBottom: 17 }, profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" }, profileInitial: { color: colors.background, fontSize: 30, fontWeight: "800" }, profileName: { color: colors.text, fontSize: 21, fontWeight: "700", marginTop: 12 }, setting: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, settingText: { flex: 1, color: colors.text }, logout: { borderWidth: 1, borderColor: "#5A2929", borderRadius: 13, alignItems: "center", padding: 15, marginTop: 25 }, logoutText: { color: colors.danger, fontWeight: "600" },
  tabs: { position: "absolute", left: 10, right: 10, bottom: 10, height: 72, borderRadius: 22, backgroundColor: "#15120F", borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4 }, tab: { flex: 1, alignItems: "center", gap: 5 }, tabText: { color: colors.muted, fontSize: 9 }, tabActive: { color: colors.goldSoft, fontWeight: "700" },
});
