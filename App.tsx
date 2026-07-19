import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View,
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

function Appointments() { return <><PageTitle title="Randevular" subtitle="19 Temmuz Pazar" action="Yeni randevu" /><View style={styles.search}><Search size={18} color={colors.muted} /><TextInput placeholder="Randevu ara" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>{appointments.map((item) => <AppointmentRow item={item} key={item.time} />)}</>; }

function Customers() { const customers = [["EY", "Elif Yılmaz", "Lazer · 6 seans kaldı"], ["ZK", "Zeynep Kaya", "Cilt bakımı · Aktif"], ["DA", "Derya Aydın", "Kirpik lifting"], ["MA", "Merve Arslan", "Kalıcı makyaj"]]; return <><PageTitle title="Müşteriler" subtitle="5.000+ müşteri kaydı" action="Yeni müşteri" /><View style={styles.search}><Search size={18} color={colors.muted} /><TextInput placeholder="İsim veya telefon ara" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>{customers.map(([initials, name, info]) => <TouchableOpacity style={styles.customer} key={name}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={styles.grow}><Text style={styles.rowTitle}>{name}</Text><Text style={styles.rowSub}>{info}</Text></View><ChevronRight color={colors.muted} size={19} /></TouchableOpacity>)}</>; }

function Finance() { return <><PageTitle title="Kasa & Finans" subtitle="Günlük işletme özeti" action="Tahsilat ekle" /><View style={styles.balance}><Text style={styles.balanceLabel}>BUGÜNKÜ TAHSİLAT</Text><Text style={styles.balanceValue}>₺18.450</Text><Text style={styles.balanceHint}>Düne göre %12 artış</Text></View><View style={styles.metricGrid}><View style={styles.metric}><Text style={styles.metricValue}>₺12.250</Text><Text style={styles.metricLabel}>Nakit</Text></View><View style={styles.metric}><Text style={styles.metricValue}>₺6.200</Text><Text style={styles.metricLabel}>Kart</Text></View><View style={styles.metric}><Text style={styles.metricValue}>₺3.500</Text><Text style={styles.metricLabel}>Bekleyen</Text></View></View><SectionTitle title="Son hareketler" />{[["Elif Yılmaz", "Lazer paket ödemesi", "+₺5.000"], ["Zeynep Kaya", "Cilt bakımı", "+₺1.750"], ["Salon gideri", "Sarf malzeme", "-₺820"]].map(([name, info, amount]) => <View style={styles.transaction} key={name}><View style={styles.transactionIcon}><CircleDollarSign size={19} color={colors.gold} /></View><View style={styles.grow}><Text style={styles.rowTitle}>{name}</Text><Text style={styles.rowSub}>{info}</Text></View><Text style={[styles.amount, String(amount).startsWith("-") && styles.negative]}>{amount}</Text></View>)}</>; }

function Profile({ role, signOut }: { role: Role; signOut: () => void }) { return <><PageTitle title="Hesabım" subtitle={`${roleLabels[role]} hesabı`} /><View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitial}>T</Text></View><Text style={styles.profileName}>Talha</Text><Text style={styles.rowSub}>talha6413@gmail.com</Text></View>{["Bildirim ayarları", "Yetkiler ve personel", "İşletme ayarları", "Güvenlik", "Yardım ve destek"].map(x => <TouchableOpacity style={styles.setting} key={x}><Settings size={18} color={colors.gold} /><Text style={styles.settingText}>{x}</Text><ChevronRight size={18} color={colors.muted} /></TouchableOpacity>)}<TouchableOpacity style={styles.logout} onPress={signOut}><Text style={styles.logoutText}>Güvenli çıkış yap</Text></TouchableOpacity></>; }

function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) { return <View style={styles.pageTitle}><View><Text style={styles.pageHeading}>{title}</Text><Text style={styles.pageSubtitle}>{subtitle}</Text></View>{action && <TouchableOpacity style={styles.smallButton}><Plus size={15} color={colors.background} /><Text style={styles.smallButtonText}>{action}</Text></TouchableOpacity>}</View>; }
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
  balance: { backgroundColor: colors.goldSoft, borderRadius: 22, padding: 22 }, balanceLabel: { color: "#4B3B26", fontSize: 10, letterSpacing: 2 }, balanceValue: { color: colors.background, fontSize: 35, fontWeight: "800", marginTop: 8 }, balanceHint: { color: "#59482F", marginTop: 5, fontSize: 12 }, transaction: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 11 }, transactionIcon: { width: 39, height: 39, backgroundColor: colors.surface, borderRadius: 12, alignItems: "center", justifyContent: "center" }, amount: { color: colors.success, fontWeight: "700" }, negative: { color: colors.danger },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginBottom: 17 }, profileAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" }, profileInitial: { color: colors.background, fontSize: 30, fontWeight: "800" }, profileName: { color: colors.text, fontSize: 21, fontWeight: "700", marginTop: 12 }, setting: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, settingText: { flex: 1, color: colors.text }, logout: { borderWidth: 1, borderColor: "#5A2929", borderRadius: 13, alignItems: "center", padding: 15, marginTop: 25 }, logoutText: { color: colors.danger, fontWeight: "600" },
  tabs: { position: "absolute", left: 10, right: 10, bottom: 10, height: 72, borderRadius: 22, backgroundColor: "#15120F", borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 4 }, tab: { flex: 1, alignItems: "center", gap: 5 }, tabText: { color: colors.muted, fontSize: 9 }, tabActive: { color: colors.goldSoft, fontWeight: "700" },
});
