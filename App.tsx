import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import {
  AlertTriangle, CalendarDays, ChevronRight, CircleDollarSign, Clock3, Home, LogIn,
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
type CustomerPackage = { id: string; customer_id: string; title: string; total_sessions: number; used_sessions: number; total_amount: number; paid_amount: number; active: boolean };
type CustomerHistory = { id: string; kind: "session" | "payment"; title: string; detail: string; occurred_at: string; amount?: number };
type CustomerPhoto = { id: string; storage_path: string; category: string; taken_at: string; signed_url?: string };
type StaffMember = { id: string; display_name: string; title: string; phone: string; active: boolean };
type Device = { id: string; name: string; model: string; room: string; shot_count: number; maintenance_due: string | null; active: boolean };
type StockItem = { id: string; name: string; unit: string; quantity: number; min_quantity: number; active: boolean };

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
  const [loading, setLoading] = useState(role !== "customer");
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [criticalStock, setCriticalStock] = useState(0);
  const [maintenanceDue, setMaintenanceDue] = useState(0);
  const [nextAppointments, setNextAppointments] = useState<LiveAppointment[]>([]);

  useEffect(() => {
    if (role === "customer" || !supabase) { setLoading(false); return; }
    async function loadDashboard() {
      if (!supabase) return;
      setLoading(true);
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
      const [appointmentResult, paymentResult, pendingResult, stockResult, deviceResult, nextResult] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).gte("starts_at", dayStart.toISOString()).lte("starts_at", dayEnd.toISOString()).neq("status", "cancelled"),
        supabase.from("payments").select("amount").gte("paid_at", dayStart.toISOString()).lte("paid_at", dayEnd.toISOString()),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending").gte("starts_at", now.toISOString()),
        supabase.from("stock_items").select("quantity,min_quantity").eq("active", true),
        supabase.from("devices").select("maintenance_due").eq("active", true).not("maintenance_due", "is", null),
        supabase.from("appointments").select("id,starts_at,ends_at,status,notes,customers(full_name)").gte("starts_at", now.toISOString()).in("status", ["pending", "confirmed"]).order("starts_at").limit(3),
      ]);
      setTodayAppointments(appointmentResult.count ?? 0);
      setTodayRevenue((paymentResult.data ?? []).reduce((sum, item) => sum + Number(item.amount || 0), 0));
      setPendingAppointments(pendingResult.count ?? 0);
      setCriticalStock((stockResult.data ?? []).filter(item => Number(item.quantity) <= Number(item.min_quantity)).length);
      setMaintenanceDue((deviceResult.data ?? []).filter(item => item.maintenance_due && new Date(item.maintenance_due) <= dayEnd).length);
      setNextAppointments((nextResult.data ?? []) as unknown as LiveAppointment[]);
      setLoading(false);
    }
    void loadDashboard();
  }, [role]);

  const metrics = role === "customer"
    ? [["2", "Aktif Paket"], ["7", "Kalan Seans"], ["24 Tem", "Sıradaki Randevu"]]
    : [[String(todayAppointments), "Bugünkü Randevu"], [formatMoney(todayRevenue), "Günlük Tahsilat"], [String(pendingAppointments), "Bekleyen İşlem"]];
  const alerts = [
    criticalStock > 0 ? `${criticalStock} stok kalemi kritik seviyede` : "",
    maintenanceDue > 0 ? `${maintenanceDue} cihazın bakım tarihi geldi` : "",
  ].filter(Boolean);
  return <>
    <View style={styles.heroCard}><View><Text style={styles.heroKicker}>{role === "customer" ? "BAKIM YOLCULUĞUNUZ" : "BUGÜNÜN ÖZETİ"}</Text><Text style={styles.heroTitle}>{role === "customer" ? "Kendinize ayırdığınız zamanı yönetin." : "Salonunuz kontrol altında."}</Text><Text style={styles.heroText}>{role === "customer" ? "Paketlerinizi, seanslarınızı ve randevularınızı tek ekrandan takip edin." : "Günün akışını, tahsilatları ve müşteri hareketlerini izleyin."}</Text></View><TouchableOpacity style={styles.heroAction} onPress={() => navigate("appointments")}><CalendarDays size={18} color={colors.background} /><Text style={styles.heroActionText}>{role === "customer" ? "RANDEVU AL" : "TAKVİMİ AÇ"}</Text></TouchableOpacity></View>
    {loading ? <View style={styles.dashboardLoading}><ActivityIndicator color={colors.gold} /><Text style={styles.emptyText}>Canlı özet hazırlanıyor…</Text></View> : <View style={styles.metricGrid}>{metrics.map(([value, label]) => <View style={styles.metric} key={label}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>}
    {role !== "customer" && alerts.length > 0 && <View style={styles.alertCard}><AlertTriangle size={20} color={colors.danger} /><View style={styles.grow}><Text style={styles.alertTitle}>İşletme uyarıları</Text>{alerts.map(alert => <Text key={alert} style={styles.alertText}>• {alert}</Text>)}</View></View>}
    <SectionTitle title={role === "customer" ? "Paketlerim" : "Sıradaki randevular"} action="Tümünü gör" />
    {role === "customer" ? <PackageCard /> : nextAppointments.length === 0 ? <View style={styles.emptyState}><CalendarDays color={colors.gold} size={26} /><Text style={styles.emptyTitle}>Yaklaşan randevu yok</Text></View> : nextAppointments.map(item => { const start = new Date(item.starts_at); return <TouchableOpacity style={styles.appointment} key={item.id} onPress={() => navigate("appointments")}><View style={styles.time}><Text style={styles.timeText}>{start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</Text><Text style={styles.dateMini}>{start.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}</Text></View><View style={styles.grow}><Text style={styles.rowTitle}>{item.customers?.full_name ?? "Müşteri"}</Text><Text style={styles.rowSub}>{item.notes || "İşlem bilgisi girilmedi"}</Text></View><ChevronRight size={18} color={colors.muted} /></TouchableOpacity>; })}
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
  const [selected, setSelected] = useState<Customer | null>(null);
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [packageTitle, setPackageTitle] = useState("");
  const [totalSessions, setTotalSessions] = useState("8");
  const [packageAmount, setPackageAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [history, setHistory] = useState<CustomerHistory[]>([]);
  const [photos, setPhotos] = useState<CustomerPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  async function openCustomer(customer: Customer) {
    setSelected(customer); setShowPackageForm(false); setPackageLoading(true); setFormError("");
    if (!supabase) { setPackageLoading(false); return; }
    const [packageResult, sessionResult, paymentResult, photoResult] = await Promise.all([
      supabase.from("customer_packages").select("id,customer_id,title,total_sessions,used_sessions,total_amount,paid_amount,active").eq("customer_id", customer.id).eq("active", true).order("created_at", { ascending: false }),
      supabase.from("session_records").select("id,session_number,performed_at,notes,customer_packages!inner(customer_id,title)").eq("customer_packages.customer_id", customer.id).order("performed_at", { ascending: false }).limit(50),
      supabase.from("payments").select("id,amount,method,paid_at,notes").eq("customer_id", customer.id).order("paid_at", { ascending: false }).limit(50),
      supabase.from("customer_photos").select("id,storage_path,category,taken_at").eq("customer_id", customer.id).order("taken_at", { ascending: false }).limit(50),
    ]);
    setPackageLoading(false);
    if (packageResult.error) { Alert.alert("Paketler yüklenemedi", packageResult.error.message); return; }
    setPackages((packageResult.data ?? []) as CustomerPackage[]);
    const sessions: CustomerHistory[] = (sessionResult.data ?? []).map((row: any) => ({ id: `s-${row.id}`, kind: "session", title: row.customer_packages?.title ?? "Seans", detail: `${row.session_number}. seans · ${row.notes || "İşlem tamamlandı"}`, occurred_at: row.performed_at }));
    const paymentMethods: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", transfer: "Havale", other: "Diğer" };
    const paymentItems: CustomerHistory[] = (paymentResult.data ?? []).map((row: any) => ({ id: `p-${row.id}`, kind: "payment", title: "Tahsilat", detail: `${paymentMethods[row.method as PaymentMethod] ?? "Ödeme"}${row.notes ? ` · ${row.notes}` : ""}`, occurred_at: row.paid_at, amount: Number(row.amount) }));
    setHistory([...sessions, ...paymentItems].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()));
    const photoRows = (photoResult.data ?? []) as CustomerPhoto[];
    if (photoRows.length) {
      const { data: signed } = await supabase.storage.from("customer-photos").createSignedUrls(photoRows.map(photo => photo.storage_path), 3600);
      setPhotos(photoRows.map((photo, index) => ({ ...photo, signed_url: signed?.[index]?.signedUrl ?? undefined })));
    } else setPhotos([]);
  }

  async function addPhoto() {
    if (!supabase || !selected) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Fotoğraf izni gerekli", "Müşteri fotoğrafı seçmek için galeri izni vermelisiniz."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.85, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    setUploadingPhoto(true);
    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) return;
    const extension = asset.mimeType?.includes("png") ? "png" : "jpg";
    const path = `${selected.id}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("customer-photos").upload(path, decode(base64), { contentType: asset.mimeType ?? "image/jpeg", upsert: false });
    if (uploadError) { setUploadingPhoto(false); Alert.alert("Fotoğraf yüklenemedi", uploadError.message); return; }
    const { data, error } = await supabase.from("customer_photos").insert({ customer_id: selected.id, storage_path: path, category: "progress", taken_at: new Date().toISOString() }).select("id,storage_path,category,taken_at").single();
    if (error) { await supabase.storage.from("customer-photos").remove([path]); setUploadingPhoto(false); Alert.alert("Fotoğraf kaydedilemedi", error.message); return; }
    const { data: signed } = await supabase.storage.from("customer-photos").createSignedUrl(path, 3600);
    setPhotos(current => [{ ...(data as CustomerPhoto), signed_url: signed?.signedUrl }, ...current]);
    setUploadingPhoto(false);
    Alert.alert("Fotoğraf eklendi", "Fotoğraf güvenli müşteri arşivine kaydedildi.");
  }

  async function savePackage() {
    if (!supabase || !selected) return;
    const sessions = Number(totalSessions);
    const total = Number(packageAmount.replace(",", "."));
    const paid = Number(paidAmount.replace(",", "."));
    if (!packageTitle.trim() || !Number.isInteger(sessions) || sessions < 1 || !Number.isFinite(total) || total < 0 || !Number.isFinite(paid) || paid < 0 || paid > total) { setFormError("Paket adı, seans ve ödeme bilgilerini kontrol edin."); return; }
    setSaving(true); setFormError("");
    const { data, error } = await supabase.from("customer_packages").insert({ customer_id: selected.id, title: packageTitle.trim(), total_sessions: sessions, total_amount: total, paid_amount: paid }).select("id,customer_id,title,total_sessions,used_sessions,total_amount,paid_amount,active").single();
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setPackages(current => [data as CustomerPackage, ...current]);
    setPackageTitle(""); setPackageAmount(""); setPaidAmount("0"); setTotalSessions("8"); setShowPackageForm(false);
    Alert.alert("Paket oluşturuldu", "Paket müşteri kartına eklendi.");
  }

  async function useSession(item: CustomerPackage) {
    if (!supabase || item.used_sessions >= item.total_sessions) return;
    const next = item.used_sessions + 1;
    setSaving(true);
    const { data: session, error: sessionError } = await supabase.from("session_records").insert({ package_id: item.id, session_number: next, notes: `${item.title} seansı` }).select("id").single();
    if (sessionError) { setSaving(false); Alert.alert("Seans kaydedilemedi", sessionError.message); return; }
    const { error } = await supabase.from("customer_packages").update({ used_sessions: next }).eq("id", item.id);
    setSaving(false);
    if (error) { await supabase.from("session_records").delete().eq("id", session.id); Alert.alert("Seans kaydedilemedi", error.message); return; }
    setPackages(current => current.map(pkg => pkg.id === item.id ? { ...pkg, used_sessions: next } : pkg));
    setHistory(current => [{ id: `s-${session.id}`, kind: "session", title: item.title, detail: `${next}. seans · İşlem tamamlandı`, occurred_at: new Date().toISOString() }, ...current]);
    Alert.alert("Seans işlendi", `${item.title}: ${next}/${item.total_sessions} seans kullanıldı.`);
  }

  const filtered = customers.filter(customer => `${customer.full_name} ${customer.phone}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr").trim()));
  const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("tr");

  return <>
    {selected && <View style={styles.detailCard}>
      <View style={styles.detailHeader}><TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.backText}>‹ Müşteriler</Text></TouchableOpacity><TouchableOpacity style={styles.smallButton} onPress={() => setShowPackageForm(value => !value)}><Plus size={15} color={colors.background} /><Text style={styles.smallButtonText}>Paket ekle</Text></TouchableOpacity></View>
      <Text style={styles.detailName}>{selected.full_name}</Text><Text style={styles.rowSub}>{selected.phone}{selected.email ? ` · ${selected.email}` : ""}</Text>{!!selected.notes && <Text style={styles.detailNote}>{selected.notes}</Text>}
      {showPackageForm && <View style={styles.packageForm}><Text style={styles.inputLabel}>Paket adı *</Text><TextInput value={packageTitle} onChangeText={setPackageTitle} placeholder="Örn. Tüm Vücut Lazer" placeholderTextColor={colors.muted} style={styles.formField} /><View style={styles.formRow}><View style={styles.formHalf}><Text style={styles.inputLabel}>Seans</Text><TextInput value={totalSessions} onChangeText={setTotalSessions} keyboardType="number-pad" style={styles.formField} /></View><View style={styles.formHalf}><Text style={styles.inputLabel}>Toplam ₺</Text><TextInput value={packageAmount} onChangeText={setPackageAmount} keyboardType="decimal-pad" style={styles.formField} /></View></View><Text style={styles.inputLabel}>Başlangıçta ödenen ₺</Text><TextInput value={paidAmount} onChangeText={setPaidAmount} keyboardType="decimal-pad" style={styles.formField} />{!!formError && <Text style={styles.error}>{formError}</Text>}<TouchableOpacity style={styles.primaryButton} onPress={() => void savePackage()} disabled={saving}><Text style={styles.primaryButtonText}>PAKETİ KAYDET</Text></TouchableOpacity></View>}
      <SectionTitle title="Aktif paketler" />
      {packageLoading ? <ActivityIndicator color={colors.gold} /> : packages.length === 0 ? <Text style={styles.emptyText}>Bu müşteriye ait aktif paket yok.</Text> : packages.map(item => { const remaining = item.total_sessions - item.used_sessions; const debt = Number(item.total_amount) - Number(item.paid_amount); return <View style={styles.livePackage} key={item.id}><View style={styles.grow}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSub}>{item.used_sessions}/{item.total_sessions} kullanıldı · {remaining} seans kaldı</Text><Text style={styles.debtText}>{debt > 0 ? `${formatMoney(debt)} borç` : "Ödemesi tamamlandı"}</Text></View><TouchableOpacity style={[styles.sessionButton, remaining === 0 && styles.disabledButton]} disabled={remaining === 0 || saving} onPress={() => void useSession(item)}><Text style={styles.sessionButtonText}>{remaining === 0 ? "Bitti" : "Seans işle"}</Text></TouchableOpacity></View>; })}
      <SectionTitle title="İşlem geçmişi" />
      {history.length === 0 ? <Text style={styles.emptyText}>Henüz seans veya tahsilat hareketi yok.</Text> : history.slice(0, 20).map(item => <View style={styles.historyRow} key={item.id}><View style={[styles.historyIcon, item.kind === "payment" && styles.historyPayment]}>{item.kind === "session" ? <Sparkles size={16} color={colors.gold} /> : <WalletCards size={16} color={colors.success} />}</View><View style={styles.grow}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSub}>{item.detail}</Text><Text style={styles.historyDate}>{new Date(item.occurred_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text></View>{item.amount != null && <Text style={styles.amount}>+{formatMoney(item.amount)}</Text>}</View>)}
      <View style={styles.photoTitle}><SectionTitle title="Fotoğraf arşivi" /><TouchableOpacity style={styles.photoButton} onPress={() => void addPhoto()} disabled={uploadingPhoto}>{uploadingPhoto ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={styles.photoButtonText}>+ Fotoğraf</Text>}</TouchableOpacity></View>
      {photos.length === 0 ? <Text style={styles.emptyText}>Bu müşteriye ait fotoğraf bulunmuyor.</Text> : <View style={styles.photoGrid}>{photos.map(photo => photo.signed_url ? <View style={styles.photoItem} key={photo.id}><Image source={{ uri: photo.signed_url }} style={styles.photoImage} /><Text style={styles.photoDate}>{new Date(photo.taken_at).toLocaleDateString("tr-TR")}</Text></View> : null)}</View>}
    </View>}
    {!selected && <>
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
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.gold} /><Text style={styles.emptyText}>Müşteriler yükleniyor…</Text></View> : filtered.length === 0 ? <View style={styles.emptyState}><UsersRound color={colors.gold} size={30} /><Text style={styles.emptyTitle}>{query ? "Eşleşen müşteri yok" : "İlk müşterinizi ekleyin"}</Text><Text style={styles.emptyText}>{query ? "Arama ifadesini değiştirin." : "Yeni müşteri düğmesiyle gerçek müşteri kaydı oluşturabilirsiniz."}</Text></View> : filtered.map(customer => <TouchableOpacity style={styles.customer} key={customer.id} onPress={() => void openCustomer(customer)}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(customer.full_name)}</Text></View><View style={styles.grow}><Text style={styles.rowTitle}>{customer.full_name}</Text><Text style={styles.rowSub}>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</Text></View><ChevronRight color={colors.muted} size={19} /></TouchableOpacity>)}
    </>}
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

function Profile({ role, signOut }: { role: Role; signOut: () => void }) {
  const [section, setSection] = useState<"account" | "staff" | "devices" | "stock">("account");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [secondary, setSecondary] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [minimum, setMinimum] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOperations(next: typeof section) {
    setSection(next); setShowForm(false); setError("");
    if (!supabase || next === "account") return;
    setLoading(true);
    if (next === "staff") { const { data, error: loadError } = await supabase.from("staff_members").select("id,display_name,title,phone,active").eq("active", true).order("display_name"); if (loadError) setError(loadError.message); else setStaff((data ?? []) as StaffMember[]); }
    if (next === "devices") { const { data, error: loadError } = await supabase.from("devices").select("id,name,model,room,shot_count,maintenance_due,active").eq("active", true).order("name"); if (loadError) setError(loadError.message); else setDevices((data ?? []) as Device[]); }
    if (next === "stock") { const { data, error: loadError } = await supabase.from("stock_items").select("id,name,unit,quantity,min_quantity,active").eq("active", true).order("name"); if (loadError) setError(loadError.message); else setStock((data ?? []) as StockItem[]); }
    setLoading(false);
  }

  async function saveOperation() {
    if (!supabase || !name.trim() || role !== "admin") { setError("Bu işlem için yönetici yetkisi ve ad alanı zorunludur."); return; }
    setSaving(true); setError("");
    if (section === "devices") {
      const { data, error: saveError } = await supabase.from("devices").insert({ name: name.trim(), model: secondary.trim(), shot_count: Number(quantity) || 0 }).select("id,name,model,room,shot_count,maintenance_due,active").single();
      if (saveError) setError(saveError.message); else setDevices(current => [data as Device, ...current]);
    }
    if (section === "stock") {
      const amount = Number(quantity.replace(",", ".")); const min = Number(minimum.replace(",", "."));
      const { data, error: saveError } = await supabase.from("stock_items").insert({ name: name.trim(), unit: secondary.trim() || "adet", quantity: Math.max(0, amount || 0), min_quantity: Math.max(0, min || 0) }).select("id,name,unit,quantity,min_quantity,active").single();
      if (saveError) setError(saveError.message); else setStock(current => [data as StockItem, ...current]);
    }
    setSaving(false); setName(""); setSecondary(""); setQuantity("0"); setMinimum("0"); setShowForm(false);
  }

  const tabs = [["account", "Hesap"], ["staff", "Personel"], ["devices", "Cihazlar"], ["stock", "Stok"]] as const;
  return <>
    <PageTitle title="Yönetim" subtitle={`${roleLabels[role]} hesabı`} action={role === "admin" && (section === "devices" || section === "stock") ? (showForm ? "Formu kapat" : "Yeni ekle") : undefined} onAction={() => setShowForm(value => !value)} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.manageTabs}>{tabs.map(([id, label]) => <TouchableOpacity key={id} style={[styles.manageTab, section === id && styles.choiceActive]} onPress={() => void loadOperations(id)}><Text style={[styles.choiceText, section === id && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>)}</ScrollView>
    {showForm && <View style={styles.customerForm}><Text style={styles.formTitle}>{section === "devices" ? "Yeni cihaz" : "Yeni stok kalemi"}</Text><Text style={styles.inputLabel}>Ad *</Text><TextInput value={name} onChangeText={setName} style={styles.formField} placeholder={section === "devices" ? "Aphro Prime" : "Lazer jeli"} placeholderTextColor={colors.muted} /><Text style={styles.inputLabel}>{section === "devices" ? "Model" : "Birim"}</Text><TextInput value={secondary} onChangeText={setSecondary} style={styles.formField} placeholder={section === "devices" ? "Diode" : "adet / litre"} placeholderTextColor={colors.muted} /><Text style={styles.inputLabel}>{section === "devices" ? "Atış sayısı" : "Miktar"}</Text><TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={styles.formField} />{section === "stock" && <><Text style={styles.inputLabel}>Kritik stok sınırı</Text><TextInput value={minimum} onChangeText={setMinimum} keyboardType="decimal-pad" style={styles.formField} /></>}{!!error && <Text style={styles.error}>{error}</Text>}<TouchableOpacity style={styles.primaryButton} onPress={() => void saveOperation()} disabled={saving}>{saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>KAYDET</Text>}</TouchableOpacity></View>}
    {section === "account" && <><View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitial}>T</Text></View><Text style={styles.profileName}>Talha</Text><Text style={styles.rowSub}>talha6413@gmail.com</Text></View><TouchableOpacity style={styles.setting}><Settings size={18} color={colors.gold} /><Text style={styles.settingText}>Bildirim ve güvenlik ayarları</Text><ChevronRight size={18} color={colors.muted} /></TouchableOpacity><TouchableOpacity style={styles.logout} onPress={signOut}><Text style={styles.logoutText}>Güvenli çıkış yap</Text></TouchableOpacity></>}
    {loading && <View style={styles.loading}><ActivityIndicator color={colors.gold} /></View>}
    {!!error && !showForm && <Text style={styles.error}>{error}</Text>}
    {section === "staff" && staff.map(item => <View style={styles.manageRow} key={item.id}><View style={styles.avatar}><Text style={styles.avatarText}>{item.display_name.slice(0, 2).toLocaleUpperCase("tr")}</Text></View><View style={styles.grow}><Text style={styles.rowTitle}>{item.display_name}</Text><Text style={styles.rowSub}>{item.title}{item.phone ? ` · ${item.phone}` : ""}</Text></View><Text style={styles.status}>Aktif</Text></View>)}
    {section === "devices" && devices.map(item => <View style={styles.manageRow} key={item.id}><View style={styles.transactionIcon}><Settings size={18} color={colors.gold} /></View><View style={styles.grow}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowSub}>{item.model || "Model yok"}{item.room ? ` · ${item.room}` : ""}</Text><Text style={styles.historyDate}>{Number(item.shot_count).toLocaleString("tr-TR")} atış{item.maintenance_due ? ` · Bakım ${new Date(item.maintenance_due).toLocaleDateString("tr-TR")}` : ""}</Text></View></View>)}
    {section === "stock" && stock.map(item => { const critical = Number(item.quantity) <= Number(item.min_quantity); return <View style={styles.manageRow} key={item.id}><View style={[styles.transactionIcon, critical && styles.criticalIcon]}><PackageCheck size={18} color={critical ? colors.danger : colors.gold} /></View><View style={styles.grow}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.rowSub}>{item.quantity} {item.unit} · Alt sınır {item.min_quantity}</Text></View><Text style={[styles.status, critical && styles.statusDanger]}>{critical ? "Kritik" : "Yeterli"}</Text></View>; })}
  </>;
}

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
  dashboardLoading: { minHeight: 82, marginTop: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 8 }, alertCard: { flexDirection: "row", gap: 12, backgroundColor: "#201515", borderWidth: 1, borderColor: "#512A2A", borderRadius: 17, padding: 15, marginTop: 12 }, alertTitle: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 4 }, alertText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 25, marginBottom: 11 }, sectionHeading: { color: colors.text, fontSize: 19, fontWeight: "600" }, sectionAction: { color: colors.gold, fontSize: 12 }, appointment: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, padding: 14 }, time: { width: 54, alignItems: "center", gap: 4 }, timeText: { color: colors.goldSoft, fontWeight: "700" }, grow: { flex: 1 }, rowTitle: { color: colors.text, fontWeight: "600", fontSize: 14 }, rowSub: { color: colors.muted, fontSize: 12, marginTop: 4 }, status: { color: colors.success, fontSize: 9 }, chevron: { alignSelf: "flex-end", marginTop: 5 }, quickGrid: { flexDirection: "row", gap: 8 }, quick: { flex: 1, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, alignItems: "center", gap: 8 }, quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#221D16", alignItems: "center", justifyContent: "center" }, quickText: { color: colors.text, fontSize: 10 }, packageCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16 }, packageIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#241E16", alignItems: "center", justifyContent: "center" }, progress: { height: 4, backgroundColor: colors.line, borderRadius: 2, marginTop: 11 }, progressFill: { width: "38%", height: 4, backgroundColor: colors.gold, borderRadius: 2 }, packageCount: { color: colors.goldSoft, fontSize: 22, fontWeight: "700" }, packageSmall: { fontSize: 9, color: colors.muted },
  pageTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, pageHeading: { color: colors.text, fontSize: 27, fontWeight: "700" }, pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 }, smallButton: { backgroundColor: colors.goldSoft, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 11, flexDirection: "row", gap: 5, alignItems: "center" }, smallButtonText: { color: colors.background, fontWeight: "700", fontSize: 10 }, search: { height: 49, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 12 }, searchInput: { flex: 1, color: colors.text, paddingHorizontal: 10 }, customer: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }, avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#2A2118", alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.goldSoft, fontWeight: "700" },
  customerForm: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginBottom: 14 }, formTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 7 }, formField: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 14, marginTop: 6 }, notesField: { minHeight: 72, paddingTop: 13, textAlignVertical: "top" }, loading: { alignItems: "center", gap: 12, paddingVertical: 40 }, emptyState: { alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 28, marginTop: 8 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700" }, emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  choiceScroll: { marginTop: 8, marginBottom: 4 }, choice: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, marginRight: 8 }, choiceActive: { backgroundColor: colors.goldSoft, borderColor: colors.goldSoft }, choiceText: { color: colors.text, fontSize: 12 }, choiceTextActive: { color: colors.background, fontWeight: "700" }, formRow: { flexDirection: "row", gap: 9 }, formHalf: { flex: 1 }, dateMini: { color: colors.muted, fontSize: 9 }, statusDanger: { color: colors.danger },
  methodGrid: { flexDirection: "row", gap: 7, marginTop: 7 }, methodChoice: { flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  detailCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 18 }, detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, backText: { color: colors.gold, fontWeight: "700" }, detailName: { color: colors.text, fontSize: 25, fontWeight: "700", marginTop: 18 }, detailNote: { color: colors.muted, backgroundColor: colors.background, borderRadius: 12, padding: 12, marginTop: 12, lineHeight: 18 }, packageForm: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 16, paddingTop: 10 }, livePackage: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.background, borderRadius: 15, padding: 14, marginBottom: 9 }, debtText: { color: colors.goldSoft, fontSize: 11, marginTop: 7 }, sessionButton: { backgroundColor: colors.goldSoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10 }, sessionButtonText: { color: colors.background, fontSize: 10, fontWeight: "800" }, disabledButton: { opacity: 0.45 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, historyIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#2A2118", alignItems: "center", justifyContent: "center" }, historyPayment: { backgroundColor: "#13271F" }, historyDate: { color: colors.muted, fontSize: 9, marginTop: 5 },
  photoTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, photoButton: { backgroundColor: colors.goldSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, minWidth: 76, alignItems: "center" }, photoButtonText: { color: colors.background, fontSize: 10, fontWeight: "800" }, photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, photoItem: { width: "31%", backgroundColor: colors.background, borderRadius: 12, overflow: "hidden" }, photoImage: { width: "100%", aspectRatio: 0.8, backgroundColor: colors.line }, photoDate: { color: colors.muted, fontSize: 8, padding: 6, textAlign: "center" },
  manageTabs: { marginBottom: 16 }, manageTab: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginRight: 7 }, manageRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line }, criticalIcon: { backgroundColor: "#301A1A" },
  balance: { backgroundColor: colors.goldSoft, borderRadius: 22, padding: 22 }, balanceLabel: { color: "#4B3B26", fontSize: 10, letterSpacing: 2 }, balanceValue: { color: colors.background, fontSize: 35, fontWeight: "800", marginTop: 8 }, balanceHint: { color: "#59482F", marginTop: 5, fontSize: 12 }, transaction: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 11 }, transactionIcon: { width: 39, height: 39, backgroundColor: colors.surface, borderRadius: 12, alignItems: "center", justifyContent: "center" }, amount: { color: colors.success, fontWeight: "700" }, negative: { color: colors.danger },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginBottom: 17 }, profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" }, profileInitial: { color: colors.background, fontSize: 30, fontWeight: "800" }, profileName: { color: colors.text, fontSize: 21, fontWeight: "700", marginTop: 12 }, setting: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, settingText: { flex: 1, color: colors.text }, logout: { borderWidth: 1, borderColor: "#5A2929", borderRadius: 13, alignItems: "center", padding: 15, marginTop: 25 }, logoutText: { color: colors.danger, fontWeight: "600" },
  tabs: { position: "absolute", left: 10, right: 10, bottom: 10, height: 72, borderRadius: 22, backgroundColor: "#15120F", borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4 }, tab: { flex: 1, alignItems: "center", gap: 5 }, tabText: { color: colors.muted, fontSize: 9 }, tabActive: { color: colors.goldSoft, fontWeight: "700" },
});
