import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Platform,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart, PieChart } from 'react-native-chart-kit';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { Calendar } from 'react-native-calendars';

const screenWidth = Dimensions.get('window').width;

// Global Stil Sabitleri
const COLORS = {
  // Dengeli Mavi ve Yeşil Tonları
  background: '#B3E5FC', // Ana ekran arka planı
  headerBackground: '#4FC3F7', // Başlık alanı için mavi
  primary: '#4FC3F7',
  selected: '#29B6F6',
  selectedBorder: '#0288D1',

  // Nötr Tonlar
  cardBackground: '#FFFFFF',
  textDark: '#000000',
  textLight: '#FFFFFF',
  border: '#B0BEC5',

  // Diğer renkler
  secondary: '#FFC107',
  danger: '#D32F2F',
  success: '#4CAF50',

  // Ağrı Şiddeti Renkleri
  severity1: '#A8E063',
  severity2: '#D4E157',
  severity3: '#FFEB3B',
  severity4: '#FFB300',
  severity5: '#EF5350',

  // Yeni buton arka plan renkleri (Önerilen renkler)
  monthlySummaryBgColor: '#2ECC71', // Aylık Özetler için Zümrüt Yeşili
  historyBgColor: '#FFD700', // Ağrı Geçmişi için Altın Sarısı
  chartBgColor: '#FF6B6B', // Grafik Görüntüle için Mercan Kırmızısı
  reportBgColor: '#29B6F6', // Rapor Oluştur için Mavi
  saveButtonColor: '#8E44AD', // Kaydet butonu için Açık Mor

  // Hava durumu butonu için yeni renk
  weatherButtonColor: '#17A2B8',

  // Yeni buton border renkleri (arka planın koyu tonları)
  monthlySummaryBorderColor: '#27AE60',
  historyBorderColor: '#FFC107',
  chartBorderColor: '#E74C3C',
  reportBorderColor: '#0288D1',
  saveButtonBorderColor: '#6C3483',
  weatherButtonBorderColor: '#0E6A7A',

  // Minimalist Gri Renkler
  grayButtonBg: '#E0E0E0',
  grayButtonText: '#757575',
};

const SPACING = {
  xxsmall: 2,
  xsmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  xl: 24,
};

const FONT_SIZES = {
  small: 14,
  medium: 17,
  large: 17,
  xl: 20,
  xxl: 26,
  xxxl: 30,
};

const BORDER_RADIUS = 10;

const upperRowTriggers = [
  { id: 'uykusuzluk', label: 'Uykusuzluk' },
  { id: 'yorgunluk', 'label': 'Yorgunluk' },
  { id: 'bilinmiyor', label: 'Bilinmiyor' },
];
const lowerRowTriggers = [
  { id: 'susuzluk', label: 'Susuzluk' },
  { id: 'aclik', label: 'Açlık' },
  { id: 'sicak', label: 'Sıcak' },
  { id: 'stres', label: 'Stres' },
  { id: 'diger', label: 'Diğer' },
];

const timeBuckets = ['Sabah', 'Öğle', 'Akşam'];

const painLocationList = [
  'Sağ',
  'Sol',
  'Göz',
  'Sağ Yan',
  'Sol Yan',
];

export default function App() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [severity, setSeverity] = useState(1);
  const [trigger, setTrigger] = useState([]);
  const [otherTrigger, setOtherTrigger] = useState('');
  const [note, setNote] = useState('');
  const [attacks, setAttacks] = useState([]);
  const [timeOfStart, setTimeOfStart] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [isWorkDay, setIsWorkDay] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonthDetails, setShowMonthDetails] = useState(false);
  const [showTxtModal, setShowTxtModal] = useState(false);
  const [txtContent, setTxtContent] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [painLocation, setPainLocation] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [selectedDayAttacks, setSelectedDayAttacks] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [showMonthlySummaryScreen, setShowMonthlySummaryScreen] = useState(false);

  useEffect(() => {
    loadAttacks();
  }, []);

  useEffect(() => {
    markAttacksOnCalendar();
  }, [attacks]);

  const loadAttacks = async () => {
    try {
      const json = await AsyncStorage.getItem('@attacks');
      const data = json ? JSON.parse(json) : [];
      setAttacks(data);
    } catch (e) {
      console.error('Veri yüklenirken hata oluştu:', e);
      Alert.alert('Hata', 'Ağrı geçmişi yüklenirken bir sorun oluştu.');
    }
  };

  const saveAttacks = async (newList) => {
    try {
      await AsyncStorage.setItem('@attacks', JSON.stringify(newList));
    } catch (e) {
      console.error('Veri kaydedilirken hata oluştu:', e);
      Alert.alert('Hata', 'Ağrı kaydedilirken bir sorun oluştu.');
    }
  };
  
  const markAttacksOnCalendar = () => {
    const dates = {};
    attacks.forEach(attack => {
      const dateKey = attack.date;
      if (!dates[dateKey]) {
        dates[dateKey] = { periods: [] };
      }
      const existingSeverity = dates[dateKey].periods.find(period => period.key === attack.severity);
      if (!existingSeverity) {
        dates[dateKey].periods.push({
          key: attack.severity,
          color: getSeverityColor(attack.severity)
        });
      }
    });
    setMarkedDates(dates);
  };

  const handleDayPress = (day) => {
    const dateKey = day.dateString;
    const attacksForDay = attacks.filter(a => a.date === dateKey);
    if (attacksForDay.length > 0) {
      setSelectedDayAttacks(attacksForDay);
      setSelectedDay(dateKey);
      setShowDayDetails(true);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const current = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(current);
  };

  const toggleTrigger = (tLabel) => {
    if (tLabel === 'Diğer') {
      if (trigger.includes('Diğer')) {
        setTrigger([]);
        setOtherTrigger('');
      } else {
        setTrigger(['Diğer']);
      }
    } else {
      let newTriggers = trigger.filter((x) => x !== 'Diğer');
      if (newTriggers.includes(tLabel)) {
        newTriggers = newTriggers.filter((x) => x !== tLabel);
      } else {
        newTriggers.push(tLabel);
      }
      setTrigger(newTriggers);
      if (trigger.includes('Diğer')) {
        setOtherTrigger('');
      }
    }
  };

  const addAttack = () => {
    if (trigger.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az bir tetikleyici seçin veya yazın.');
      return;
    }
    if (!timeOfStart) {
      Alert.alert('Eksik Bilgi', 'Lütfen ağrının başlangıç zamanını seçin.');
      return;
    }
    if (trigger.includes('Diğer') && !otherTrigger.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen "Diğer" tetikleyici için bir açıklama yazın.');
      return;
    }
    if (isWorkDay === null) {
      Alert.alert('Eksik Bilgi', 'Lütfen "Çalışma günü müydü?" seçeneğini belirtin.');
      return;
    }
    if (painLocation === null) {
      Alert.alert('Eksik Bilgi', 'Lütfen baş ağrısının neresi olduğunu belirtin.');
      return;
    }

    let usedTriggers = trigger.filter((t) => t !== 'Diğer');
    if (trigger.includes('Diğer')) usedTriggers.push(otherTrigger.trim());

    const newAttack = {
      id: Date.now(),
      date: date.toISOString().split('T')[0],
      timeBucket: timeOfStart,
      severity,
      trigger: usedTriggers,
      note: note.trim(),
      isWorkDay,
      painLocation,
    };
    const newList = [newAttack, ...attacks];
    setAttacks(newList);
    saveAttacks(newList);
    setSeverity(1);
    setTrigger([]);
    setOtherTrigger('');
    setNote('');
    setTimeOfStart('');
    setIsWorkDay(null);
    setPainLocation(null);

    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  const deleteAttack = (id) => {
    const filtered = attacks.filter((a) => a.id !== id);
    setAttacks(filtered);
    saveAttacks(filtered);
    Alert.alert('Silindi', 'Ağrı başarıyla silindi.');
  };

  const attacksByMonthSummary = () => {
    const summary = {};
    attacks.forEach((a) => {
      const month = a.date.slice(0, 7);
      if (!summary[month]) summary[month] = { total: 0, days: new Set(), attacks: [] };
      if (!summary[month].total) summary[month].total = 0;
      if (!summary[month].days) summary[month].days = new Set();
      if (!summary[month].attacks) summary[month].attacks = [];

      summary[month].total++;
      summary[month].days.add(a.date);
      summary[month].attacks.push(a);
    });
    return summary;
  };

  const summary = attacksByMonthSummary();
  const sortedMonths = Object.keys(summary).sort((a, b) => b.localeCompare(a));

  const monthAttacks = selectedMonth ? summary[selectedMonth]?.attacks || [] : [];

  const generateMonthTxt = () => {
    if (!selectedMonth) return '';
    const lines = [`${selectedMonth} Ağrı Detayları:\n`];
    monthAttacks.forEach((a, i) => {
      lines.push(
        `--- Ağrı ${i + 1} ---`,
        `Tarih: ${a.date}`,
        `Zaman: ${a.timeBucket}`,
        `Şiddet: ${a.severity}`,
        `Tetikleyici: ${a.trigger.join(', ')}`,
        `Not: ${a.note || '-'}`,
        `Çalışma Günü: ${a.isWorkDay ? 'Evet' : 'Hayır'}`,
        `Ağrı Konumu: ${a.painLocation || '-'}`
      );
      lines.push('');
    });
    return lines.join('\n');
  };

  const openMonthDetails = (month) => {
    setSelectedMonth(month);
    setShowMonthDetails(true);
  };

  const closeMonthDetails = () => {
    setSelectedMonth(null);
    setShowMonthDetails(false);
  };

  const openTxtModal = () => {
    setTxtContent(generateMonthTxt());
    setShowTxtModal(true);
  };

  const closeTxtModal = () => {
    setShowTxtModal(false);
    setTxtContent('');
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 1:
        return COLORS.severity1;
      case 2:
        return COLORS.severity2;
      case 3:
        return COLORS.severity3;
      case 4:
        return COLORS.severity4;
      case 5:
        return COLORS.severity5;
      default:
        return COLORS.cardBackground;
    }
  };

  const filterAttacks = (period) => {
    const now = new Date();
    if (period === 'all') {
      return attacks;
    }
    return attacks.filter(attack => {
      const attackDate = new Date(attack.date);
      let filterDate = new Date(now);

      switch (period) {
        case 'last7days':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'last30days':
          filterDate.setDate(now.getDate() - 30);
          break;
        case 'last3months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'last6months':
          filterDate.setMonth(now.getMonth() - 6);
          break;
        case 'last1year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          return true;
      }
      return attackDate >= filterDate;
    });
  };

  function processTriggerSeverityData(attacks) {
    if (!attacks || attacks.length === 0) return { labels: [], data: [] };
    const triggerData = {};
    attacks.forEach(attack => {
      attack.trigger.forEach(t => {
        if (!triggerData[t]) {
          triggerData[t] = { totalSeverity: 0, count: 0 };
        }
        triggerData[t].totalSeverity += attack.severity;
        triggerData[t].count++;
      });
    });
    const labels = Object.keys(triggerData);
    const data = labels.map(t =>
      (triggerData[t].totalSeverity / triggerData[t].count).toFixed(1)
    );
    return { labels, data };
  }

  function processPainLocationSeverityData(attacks) {
    if (!attacks || attacks.length === 0) return { labels: [], data: [] };
    const locationData = {};
    attacks.forEach(attack => {
      const location = attack.painLocation || 'Bilinmiyor';
      if (!locationData[location]) {
        locationData[location] = { totalSeverity: 0, count: 0 };
      }
      locationData[location].totalSeverity += attack.severity;
      locationData[location].count++;
    });
    const labels = Object.keys(locationData);
    const data = labels.map(loc =>
      (locationData[loc].totalSeverity / locationData[loc].count).toFixed(1)
    );
    return { labels, data };
  }

  function processWorkdayDistributionData(attacks) {
    if (!attacks || attacks.length === 0) return [];
    const counts = {
      workdays: 0,
      nonWorkdays: 0
    };
    attacks.forEach(attack => {
      if (attack.isWorkDay) {
        counts.workdays++;
      } else {
        counts.nonWorkdays++;
      }
    });
    const total = counts.workdays + counts.nonWorkdays;
    if (total === 0) return [];
    return [
      {
        name: 'Çalışma Günü',
        population: counts.workdays,
        color: COLORS.primary,
        legendFontColor: COLORS.textDark,
        legendFontSize: 15,
      },
      {
        name: 'Tatil Günü',
        population: counts.nonWorkdays,
        color: COLORS.secondary,
        legendFontColor: COLORS.textDark,
        legendFontSize: 15,
      },
    ];
  }

  const ChartSection = ({ attacks }) => {
    const [selectedFilter, setSelectedFilter] = useState('all');
    const filteredAttacks = filterAttacks(selectedFilter);

    if (filteredAttacks.length === 0) {
      return <Text style={styles.chartNoDataText}>Seçilen zaman diliminde Ağrı kaydı bulunmamaktadır.</Text>;
    }

    const triggerData = processTriggerSeverityData(filteredAttacks);
    const painLocationData = processPainLocationSeverityData(filteredAttacks);
    const workdayData = processWorkdayDistributionData(filteredAttacks);

    const chartConfig = {
      backgroundColor: COLORS.cardBackground,
      backgroundGradientFrom: COLORS.cardBackground,
      backgroundGradientTo: COLORS.cardBackground,
      decimalPlaces: 1,
      color: (opacity = 1) => COLORS.primary,
      labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
      style: { borderRadius: BORDER_RADIUS },
      propsForDots: { r: '6', strokeWidth: '2', stroke: COLORS.primary },
      barPercentage: 0.8,
    };

    return (
      <ScrollView>
        <View style={styles.filterButtonContainer}>
          <TouchableOpacity
            style={[styles.filterButton, styles.narrowFilterButton, selectedFilter === 'last7days' && styles.filterButtonSelected]}
            onPress={() => setSelectedFilter('last7days')}
          >
            <Text style={[styles.filterButtonText, selectedFilter === 'last7days' && styles.filterButtonTextSelected]}>Son 7 Gün</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, styles.narrowFilterButton, selectedFilter === 'last30days' && styles.filterButtonSelected]}
            onPress={() => setSelectedFilter('last30days')}
          >
            <Text style={[styles.filterButtonText, selectedFilter === 'last30days' && styles.filterButtonTextSelected]}>Son 30 Gün</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, styles.narrowFilterButton, selectedFilter === 'last3months' && styles.filterButtonSelected]}
            onPress={() => setSelectedFilter('last3months')}
          >
            <Text style={[styles.filterButtonText, selectedFilter === 'last3months' && styles.filterButtonTextSelected]}>Son 3 Ay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'last6months' && styles.filterButtonSelected]}
            onPress={() => setSelectedFilter('last6months')}
          >
            <Text style={[styles.filterButtonText, selectedFilter === 'last6months' && styles.filterButtonTextSelected]}>Son 6 Ay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'last1year' && styles.filterButtonSelected]}
            onPress={() => setSelectedFilter('last1year')}
          >
            <Text style={[styles.filterButtonText, selectedFilter === 'last1year' && styles.filterButtonTextSelected]}>Son 1 Yıl</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonSelected]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextSelected]}>Tüm Zamanlar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.chartTitle}>Tetikleyiciye Göre Ortalama Şiddet</Text>
        {triggerData.labels.length > 0 ? (
          <ScrollView horizontal style={styles.chartContainer}>
            <BarChart
              data={{
                labels: triggerData.labels,
                datasets: [{ data: triggerData.data }],
              }}
              width={Math.max(triggerData.labels.length * 70, screenWidth - SPACING.large * 2)}
              height={250}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={{ borderRadius: BORDER_RADIUS, paddingVertical: SPACING.medium }}
              fromZero
              showValuesOnTopOfBars
            />
          </ScrollView>
        ) : (
          <Text style={styles.chartNoDataText}>Grafik için yeterli tetikleyici verisi yok.</Text>
        )}

        <Text style={styles.chartTitle}>Ağrı Konumuna Göre Ortalama Şiddet</Text>
        {painLocationData.labels.length > 0 ? (
          <ScrollView horizontal style={styles.chartContainer}>
            <BarChart
              data={{
                labels: painLocationData.labels,
                datasets: [{ data: painLocationData.data }],
              }}
              width={Math.max(painLocationData.labels.length * 70, screenWidth - SPACING.large * 2)}
              height={250}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={{ borderRadius: BORDER_RADIUS, paddingVertical: SPACING.medium }}
              fromZero
              showValuesOnTopOfBars
            />
          </ScrollView>
        ) : (
          <Text style={styles.chartNoDataText}>Grafik için yeterli ağrı konumu verisi yok.</Text>
        )}

        <Text style={styles.chartTitle}>Çalışma Günü / Tatil Günü Dağılımı</Text>
        {workdayData.length > 0 && (workdayData[0].population > 0 || workdayData[1].population > 0) ? (
          <View style={styles.chartContainer}>
            <PieChart
              data={workdayData}
              width={screenWidth - SPACING.large * 2}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        ) : (
          <Text style={styles.chartNoDataText}>Grafik için yeterli çalışma günü verisi yok.</Text>
        )}
      </ScrollView>
    );
  };

  const ReportModal = ({ isVisible, onClose, attacks }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('last3months');
    const [reportContent, setReportContent] = useState('');

    const getPeriodLabel = (period) => {
      switch (period) {
        case 'last30days': return 'Son 30 Gün';
        case 'last3months': return 'Son 3 Ay';
        case 'last6months': return 'Son 6 Ay';
        case 'last1year': return 'Son 1 Yıl';
        case 'all': return 'Tüm Zamanlar';
        default: return 'Özel Tarih Aralığı';
      }
    };

    const generateMonthlySummary = (attacks) => {
      const summary = {};
      attacks.forEach(a => {
        const month = a.date.slice(0, 7);
        summary[month] = (summary[month] || 0) + 1;
      });
      const sortedMonths = Object.keys(summary).sort((a, b) => b.localeCompare(a));
      return sortedMonths.map(month => `${month}: ${summary[month]} atak`).join('\n');
    };

    const generateReport = (period) => {
      const filteredAttacks = filterAttacks(period);

      if (filteredAttacks.length === 0) {
        setReportContent("Seçilen tarih aralığında migren kaydı bulunamamıştır.");
        return;
      }

      const totalAttacks = filteredAttacks.length;

      const triggerCounts = {};
      filteredAttacks.forEach(a => {
        a.trigger.forEach(t => {
          triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        });
      });
      const sortedTriggers = Object.keys(triggerCounts).sort((a, b) => triggerCounts[b] - triggerCounts[a]);
      const topTriggers = sortedTriggers.slice(0, 3).map(t => `${t} (${triggerCounts[t]} kez)`).join(', ');

      const totalSeverity = filteredAttacks.reduce((sum, a) => sum + a.severity, 0);
      const averageSeverity = (totalSeverity / totalAttacks).toFixed(1);

      const locationCounts = {};
      filteredAttacks.forEach(a => {
        const location = a.painLocation || 'Bilinmiyor';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });
      const sortedLocations = Object.keys(locationCounts).sort((a, b) => locationCounts[b] - locationCounts[a]);
      const topLocation = sortedLocations.length > 0 ? sortedLocations[0] : 'Bilinmiyor';

      const reportText = `--- Migren Raporu (${getPeriodLabel(period)}) ---\n\n` +
        `Rapor Tarihi: ${new Date().toLocaleDateString()}\n\n` +
        `Toplam Atak Sayısı: ${totalAttacks}\n` +
        `Ortalama Ağrı Şiddeti: ${averageSeverity}\n` +
        `En Sık Görülen Tetikleyiciler: ${topTriggers || '-'}\n` +
        `En Sık Görülen Ağrı Bölgesi: ${topLocation || '-'}\n` +
        `\n` +
        `Aylara Göre Dağılım:\n` +
        generateMonthlySummary(filteredAttacks) +
        `\n--- Rapor Sonu ---\n`;
      setReportContent(reportText);
    };

    const shareReport = async () => {
      if (await Sharing.isAvailableAsync()) {
        const fileUri = `${FileSystem.documentDirectory}migren_raporu_${new Date().getTime()}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, reportContent);
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Migren Raporu' });
      } else {
        Alert.alert('Hata', 'Dosya paylaşımı bu cihazda desteklenmiyor.');
      }
    };
    
    // Rapor metnini panoya kopyalama işlevi
    const copyReport = async () => {
        await Clipboard.setStringAsync(reportContent);
        Alert.alert('Kopyalandı', 'Rapor metni panoya kopyalandı.');
    };

    useEffect(() => {
      if (isVisible) {
        generateReport(selectedPeriod);
      }
    }, [isVisible, selectedPeriod, attacks]);

    return (
      <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Migren Raporu</Text>

          <View style={styles.reportFilterButtons}>
            <TouchableOpacity
              style={[styles.reportFilterButton, selectedPeriod === 'last30days' && styles.reportFilterButtonSelected]}
              onPress={() => setSelectedPeriod('last30days')}
            >
              <Text style={[styles.reportFilterButtonText, selectedPeriod === 'last30days' && styles.reportFilterButtonTextSelected]}>Son 30 Gün</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportFilterButton, selectedPeriod === 'last3months' && styles.reportFilterButtonSelected]}
              onPress={() => setSelectedPeriod('last3months')}
            >
              <Text style={[styles.reportFilterButtonText, selectedPeriod === 'last3months' && styles.reportFilterButtonTextSelected]}>Son 3 Ay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportFilterButton, selectedPeriod === 'last6months' && styles.reportFilterButtonSelected]}
              onPress={() => setSelectedPeriod('last6months')}
            >
              <Text style={[styles.reportFilterButtonText, selectedPeriod === 'last6months' && styles.reportFilterButtonTextSelected]}>Son 6 Ay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportFilterButton, styles.reportFilterButtonWide, selectedPeriod === 'last1year' && styles.reportFilterButtonSelected]}
              onPress={() => setSelectedPeriod('last1year')}
            >
              <Text style={[styles.reportFilterButtonText, selectedPeriod === 'last1year' && styles.reportFilterButtonTextSelected]}>Son 1 Yıl</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportFilterButton, styles.reportFilterButtonWide, selectedPeriod === 'all' && styles.reportFilterButtonSelected]}
              onPress={() => setSelectedPeriod('all')}
            >
              <Text style={[styles.reportFilterButtonText, selectedPeriod === 'all' && styles.reportFilterButtonTextSelected]}>Tüm Zamanlar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text selectable style={styles.reportContentText}>{reportContent}</Text>
          </ScrollView>

          <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionButton, {backgroundColor: COLORS.secondary}]} onPress={copyReport}>
              <Text style={styles.modalActionButtonText}>Kopyala</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalActionButton, {backgroundColor: COLORS.success}]} onPress={shareReport}>
              <Text style={styles.modalActionButtonText}>Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalActionButton, {backgroundColor: COLORS.danger}]} onPress={onClose}>
              <Text style={styles.modalActionButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };
  
  const DayDetailsModal = ({ isVisible, onClose, attacksForDay, day }) => {
    return (
      <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{day} Tarihindeki Ataklar</Text>
          <ScrollView style={styles.modalContent}>
            {attacksForDay.map((item, index) => (
              <View key={item.id} style={styles.attackItemCard}>
                <Text style={styles.itemHeader}>Atak {index + 1}</Text>
                <Text style={styles.itemLabel}>Şiddet: <Text style={styles.itemValue}>{item.severity}</Text></Text>
                <Text style={styles.itemLabel}>Zaman: <Text style={styles.itemValue}>{item.timeBucket}</Text></Text>
                <Text style={styles.itemLabel}>Tetikleyici: <Text style={styles.itemValue}>{item.trigger.join(', ')}</Text></Text>
                <Text style={styles.itemLabel}>Ağrı Konumu: <Text style={styles.itemValue}>{item.painLocation || '-'}</Text></Text>
                <Text style={styles.itemLabel}>Not: <Text style={styles.itemValue}>{item.note || '-'}</Text></Text>
                <Text style={styles.itemLabel}>Çalışma Günü: <Text style={styles.itemValue}>{item.isWorkDay ? 'Evet' : 'Hayır'}</Text></Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.danger, borderColor: COLORS.danger }]} onPress={onClose}>
            <Text style={[styles.actionButtonText, { color: COLORS.textLight }]}>Kapat</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: '#F8E8F8' }]}> Migren Günlüğü </Text>
      </View>

      {!showHistory && !showChart && !showMonthlySummaryScreen && !showReportModal && (
        <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
          {showSuccessMessage && (
            <View style={styles.successMessageContainer}>
              <Text style={styles.successMessageText}>Ağrı kaydedildi!</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.datePickerButton}
          >
            <Text style={styles.datePickerText}>Tarih: {date.toISOString().split('T')[0]}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <Text style={styles.label}>Ağrı Şiddeti:</Text>
          <View style={styles.optionRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setSeverity(n)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: severity === n ? getSeverityColor(n) : COLORS.cardBackground,
                    borderColor: severity === n ? getSeverityColor(n) : COLORS.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    severity === n && { color: COLORS.textLight },
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Ağrı ne zaman başladı?</Text>
          <View style={styles.optionRow}>
            {timeBuckets.map((tb) => (
              <TouchableOpacity
                key={tb}
                onPress={() => setTimeOfStart(tb)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: timeOfStart === tb ? COLORS.selected : COLORS.cardBackground,
                    borderColor: timeOfStart === tb ? COLORS.selectedBorder : COLORS.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    { color: timeOfStart === tb ? COLORS.textLight : COLORS.textDark },
                  ]}
                >
                  {tb}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Çalışma günü müydü?</Text>
          <View style={styles.optionRow}>
            <TouchableOpacity
              onPress={() => setIsWorkDay(true)}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isWorkDay === true ? COLORS.selected : COLORS.cardBackground,
                  borderColor: isWorkDay === true ? COLORS.selectedBorder : COLORS.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  { color: isWorkDay === true ? COLORS.textLight : COLORS.textDark },
                ]}
              >
                Evet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsWorkDay(false)}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isWorkDay === false ? COLORS.selected : COLORS.cardBackground,
                  borderColor: isWorkDay === false ? COLORS.selectedBorder : COLORS.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  { color: isWorkDay === false ? COLORS.textLight : COLORS.textDark },
                ]}
              >
                Hayır
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.triggerSection}>
            <Text style={styles.label}>Tetikleyici </Text>
            <View style={styles.triggerRow}>
              {upperRowTriggers.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => toggleTrigger(t.label)}
                  style={[
                    styles.triggerButton,
                    styles.upperTriggerButton,
                    {
                      backgroundColor: trigger.includes(t.label) ? COLORS.selected : COLORS.cardBackground,
                      borderColor: trigger.includes(t.label) ? COLORS.selectedBorder : COLORS.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.triggerButtonText,
                      { color: trigger.includes(t.label) ? COLORS.textLight : COLORS.textDark },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.triggerRow}>
              {lowerRowTriggers.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => toggleTrigger(t.label)}
                  style={[
                    styles.triggerButton,
                    {
                      backgroundColor: trigger.includes(t.label) ? COLORS.selected : COLORS.cardBackground,
                      borderColor: trigger.includes(t.label) ? COLORS.selectedBorder : COLORS.border,
                    },
                    (t.id === 'susuzluk' || t.id === 'diger') ? { minWidth: screenWidth / 4.8 } :
                    { minWidth: screenWidth / 6.8 }
                  ]}
                >
                  <Text
                    style={[
                      styles.triggerButtonText,
                      { color: trigger.includes(t.label) ? COLORS.textLight : COLORS.textDark },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {trigger.includes('Diğer') && (
              <TextInput
                style={styles.textInput}
                placeholder="Diğer tetikleyiciyi açıklayın..."
                placeholderTextColor={COLORS.textDark + '80'}
                value={otherTrigger}
                onChangeText={setOtherTrigger}
              />
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Ağrı bölgesi</Text>
          <View style={styles.painLocationRow}>
            {painLocationList.map((location) => (
              <TouchableOpacity
                key={location}
                onPress={() => setPainLocation(location)}
                style={[
                  styles.painLocationButton,
                  {
                    backgroundColor: painLocation === location ? COLORS.selected : COLORS.cardBackground,
                    borderColor: painLocation === location ? COLORS.selectedBorder : COLORS.border,
                  },
                  location === 'Göz'
                    ? { minWidth: screenWidth / 6.5, maxWidth: screenWidth / 6.5 }
                    : { minWidth: screenWidth / 5.2, maxWidth: screenWidth / 5.2 }
                ]}
              >
                <Text
                  style={[
                    styles.painLocationButtonText,
                    { color: painLocation === location ? COLORS.textLight : COLORS.textDark },
                  ]}
                >
                  {location}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TextInput
            style={styles.textInput}
            placeholder="İsteğe bağlı not ekle..."
            placeholderTextColor={COLORS.textDark + '80'}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.sideBySideButton, {
                  backgroundColor: COLORS.saveButtonColor,
                  borderColor: COLORS.saveButtonBorderColor,
                }]}
                onPress={addAttack}
              >
                <Text style={[styles.actionButtonText, { color: COLORS.textDark }]}>Ağrı Kaydet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.sideBySideButton, {
                  backgroundColor: COLORS.monthlySummaryBgColor,
                  borderColor: COLORS.monthlySummaryBorderColor,
                }]}
                onPress={() => setShowMonthlySummaryScreen(true)}
              >
                <Text style={[styles.actionButtonText, { color: COLORS.textDark }]}>Aylık Özetler</Text>
              </TouchableOpacity>
            </View>

          <View style={styles.secondaryActions}>
            <TouchableOpacity 
              style={[styles.secondaryActionButton, { 
                backgroundColor: COLORS.historyBgColor, 
                borderColor: COLORS.historyBorderColor 
              }]} 
              onPress={() => setShowHistory(true)}
            >
              <Text style={[styles.secondaryActionButtonText, { color: COLORS.textDark }]}>Ağrı Geçmişi</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryActionButton, { 
                backgroundColor: COLORS.chartBgColor, 
                borderColor: COLORS.chartBorderColor 
              }]} 
              onPress={() => setShowChart(true)}
            >
              <Text style={[styles.secondaryActionButtonText, { color: COLORS.textDark }]}>Grafik Görüntüle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryActionButton, { 
                backgroundColor: COLORS.reportBgColor, 
                borderColor: COLORS.reportBorderColor 
              }]} 
              onPress={() => setShowReportModal(true)}
            >
              <Text style={[styles.secondaryActionButtonText, { color: COLORS.textDark }]}>Rapor Oluştur</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Takvim Görünümü:</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              markedDates={markedDates}
              markingType={'multi-period'}
              onDayPress={handleDayPress}
              theme={{
                calendarBackground: COLORS.cardBackground,
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.textLight,
                todayTextColor: COLORS.selected,
                dayTextColor: COLORS.textDark,
                textDisabledColor: '#d9e1e8',
                dotColor: COLORS.primary,
                selectedDotColor: COLORS.textLight,
                arrowColor: COLORS.selectedBorder,
                monthTextColor: COLORS.textDark,
                textDayFontFamily: 'sans-serif',
                textMonthFontFamily: 'sans-serif',
                textDayHeaderFontFamily: 'sans-serif',
                textDayFontSize: FONT_SIZES.small,
                textMonthFontSize: FONT_SIZES.large,
                textDayHeaderFontSize: FONT_SIZES.small,
              }}
            />
          </View>
        </ScrollView>
      )}

      {showHistory && !showChart && !showMonthlySummaryScreen && !showReportModal && (
        <View style={styles.historyScreen}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowHistory(false)}>
            <Text style={styles.backButtonText}>{'< Geri'}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Ağrı Geçmişi</Text>
          {attacks.length === 0 && <Text style={styles.noDataText}>Henüz kaydedilmiş Ağrı bulunmamaktadır.</Text>}
          <FlatList
            data={attacks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.attackItemCard}>
                <Text style={styles.itemLabel}>Tarih: <Text style={styles.itemValue}>{item.date}</Text></Text>
                <Text style={styles.itemLabel}>Ağrı Başlangıcı: <Text style={styles.itemValue}>{item.timeBucket}</Text></Text>
                <Text style={styles.itemLabel}>Şiddet: <Text style={styles.itemValue}>{item.severity}</Text></Text>
                <Text style={styles.itemLabel}>Tetikleyici: <Text style={styles.itemValue}>{item.trigger.join(', ')}</Text></Text>
                <Text style={styles.itemLabel}>Ağrı Konumu: <Text style={styles.itemValue}>{item.painLocation || '-'}</Text></Text>
                <Text style={styles.itemLabel}>Not: <Text style={styles.itemValue}>{item.note || '-'}</Text></Text>
                <Text style={styles.itemLabel}>Çalışma Günü: <Text style={styles.itemValue}>{item.isWorkDay ? 'Evet' : 'Hayır'}</Text></Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    Alert.alert(
                      'Ağrı Sil',
                      'Bu atağı silmek istediğinizden emin misiniz?',
                      [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Sil', onPress: () => deleteAttack(item.id), style: 'destructive' },
                      ],
                      { cancelable: true }
                    )
                  }
                >
                  <Text style={styles.deleteButtonText}>Sil</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
      
      {showMonthlySummaryScreen && !showHistory && !showChart && !showReportModal && (
        <View style={styles.monthDetailScreen}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowMonthlySummaryScreen(false)}>
            <Text style={styles.backButtonText}>{'< Geri'}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Aylık Özetler</Text>
          <ScrollView style={styles.monthDetailList} showsVerticalScrollIndicator={false}>
            {sortedMonths.length === 0 && <Text style={styles.noDataText}>Henüz Ağrı kaydı bulunmamaktadır.</Text>}
            {sortedMonths.map((month) => (
              <TouchableOpacity
                key={month}
                onPress={() => openMonthDetails(month)}
                style={styles.monthSummaryCard}
              >
                <Text style={styles.monthSummaryTitle}>
                  {month} ({summary[month].total} Ağrı)
                </Text>
                <Text style={styles.monthSummaryDates}>
                  Tarihler: {[...summary[month].days]
                    .map((d) => d.split('-')[2])
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showMonthDetails && !showChart && !showReportModal && (
        <View style={styles.monthDetailScreen}>
          <TouchableOpacity style={styles.backButton} onPress={closeMonthDetails}>
            <Text style={styles.backButtonText}>{'< Geri'}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{selectedMonth} Ağrı Detayları</Text>
          {monthAttacks.length === 0 && <Text style={styles.noDataText}>Bu ayda Ağrı bulunmamaktadır.</Text>}
          <ScrollView style={styles.monthDetailList} showsVerticalScrollIndicator={false}>
            {monthAttacks.map((a, i) => (
              <View key={a.id} style={styles.attackItemCard}>
                <Text style={styles.itemHeader}>Ağrı {i + 1}</Text>
                <Text style={styles.itemLabel}>Tarih: <Text style={styles.itemValue}>{a.date}</Text></Text>
                <Text style={styles.itemLabel}>Ağrı Başlangıcı: <Text style={styles.itemValue}>{a.timeBucket}</Text></Text>
                <Text style={styles.itemLabel}>Şiddet: <Text style={styles.itemValue}>{a.severity}</Text></Text>
                <Text style={styles.itemLabel}>Tetikleyici: <Text style={styles.itemValue}>{a.trigger.join(', ')}</Text></Text>
                <Text style={styles.itemLabel}>Ağrı Konumu: <Text style={styles.itemValue}>{a.painLocation || '-'}</Text></Text>
                <Text style={styles.itemLabel}>Not: <Text style={styles.itemValue}>{a.note || '-'}</Text></Text>
                <Text style={styles.itemLabel}>Çalışma Günü: <Text style={styles.itemValue}>{a.isWorkDay ? 'Evet' : 'Hayır'}</Text></Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.actionButton, { 
              backgroundColor: COLORS.reportBgColor,
              borderColor: COLORS.reportBorderColor 
            }]} onPress={openTxtModal}>
              <Text style={styles.actionButtonText}>Ayı TXT Olarak Paylaş</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <Modal visible={showTxtModal} animationType="slide" onRequestClose={closeTxtModal}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>TXT İçeriği</Text>
          <ScrollView style={styles.modalContent}>
            <Text selectable style={styles.txtContentText}>
              {txtContent}
            </Text>
          </ScrollView>
          <TouchableOpacity style={[styles.actionButton, {
            backgroundColor: COLORS.danger, 
            borderColor: COLORS.danger
          }]} onPress={closeTxtModal}>
            <Text style={[styles.actionButtonText, { color: COLORS.textLight }]}>Kapat</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {showChart && !showMonthlySummaryScreen && !showReportModal && (
        <View style={styles.chartScreen}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowChart(false)}>
            <Text style={styles.backButtonText}>{'< Geri'}</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Ağrı Grafiği</Text>
          <ChartSection attacks={attacks} />
        </View>
      )}

      <ReportModal
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        attacks={attacks}
      />
      
      <DayDetailsModal
        isVisible={showDayDetails}
        onClose={() => setShowDayDetails(false)}
        attacksForDay={selectedDayAttacks}
        day={selectedDay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.headerBackground,
    paddingTop: 0,
  },
  headerContainer: {
    backgroundColor: COLORS.headerBackground,
    paddingVertical: 16,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'normal',
    letterSpacing: 0.5,
    color: '#F8E8F8', // Beyaz yazı rengi
    textShadowColor: COLORS.selectedBorder, // Koyu mavi gölge rengi
    textShadowOffset: { width: 2, height: 2 }, // Gölge konumu
    textShadowRadius: 2, // Gölgenin yayılma efekti
    marginTop: 7, // Yazı biraz daha aşağıya kaydırıldı
  },
  section: {
    flex: 1,
    paddingHorizontal: 7,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.medium,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: SPACING.medium,
    marginBottom: SPACING.medium,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: SPACING.large,
    marginBottom: SPACING.medium,
    textAlign: 'center',
  },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 3,
    marginBottom: 1,
    textAlign: 'center',
  },
  datePickerButton: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.small, // Değiştirildi: SPACING.medium -> SPACING.small
    width: '50%',
    alignSelf: 'center',
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: SPACING.small,
    borderWidth: 1,
    borderColor: COLORS.selectedBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  datePickerText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.selectedBorder,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 2,
  },
  optionButton: {
    paddingVertical: 7.5,
    paddingHorizontal: SPACING.large,
    marginHorizontal: SPACING.small,
    marginBottom: SPACING.xsmall,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  optionButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  divider: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    marginVertical: 3,
    width: '80%',
    alignSelf: 'center',
  },
  triggerSection: {
    marginBottom: SPACING.medium,
    marginTop: 3,
  },
  triggerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.small,
    alignItems: 'stretch',
  },
  triggerButton: {
    paddingVertical: 7.5,
    paddingHorizontal: 3,
    marginHorizontal: 3,
    marginBottom: SPACING.xsmall,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 35,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  upperTriggerButton: {
    flex: 1,
    minWidth: (screenWidth - (7 * 2) - (3 * 2 * upperRowTriggers.length)) / upperRowTriggers.length,
  },
  triggerButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  painLocationRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    marginBottom: SPACING.xsmall,
  },
  painLocationButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: 7,
    marginHorizontal: 3,
    marginBottom: SPACING.xsmall,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  painLocationButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.medium,
    marginVertical: SPACING.xsmall,
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.textDark,
    backgroundColor: COLORS.cardBackground,
    textAlign: 'center',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.medium,
    marginTop: SPACING.small,
  },
  sideBySideButton: {
    flex: 1,
    marginHorizontal: SPACING.xsmall,
  },
  actionButton: {
    borderWidth: 1,
    paddingVertical: SPACING.medium,
    paddingHorizontal: 5, 
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionButtonText: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.large,
  },
  secondaryActionButton: {
    borderWidth: 1,
    paddingVertical: 5, 
    paddingHorizontal: 5, 
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center', 
    flex: 1,
    marginHorizontal: SPACING.small,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  secondaryActionButtonText: {
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: SPACING.medium,
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.textDark,
    fontSize: FONT_SIZES.medium,
    marginVertical: SPACING.large,
  },
  monthSummaryCard: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS,
    marginBottom: SPACING.small,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  monthSummaryTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  monthSummaryDates: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textDark,
    marginTop: SPACING.xsmall,
  },
  historyScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 7,
  },
  backButton: {
    backgroundColor: COLORS.selectedBorder,
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS,
    alignSelf: 'flex-start',
    marginTop: SPACING.medium,
    marginLeft: SPACING.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  backButtonText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  attackItemCard: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS,
    marginBottom: SPACING.small,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  itemLabel: {
    fontWeight: 'bold',
    fontSize: FONT_SIZES.small,
    color: COLORS.textDark,
    lineHeight: 22,
  },
  itemValue: {
    fontWeight: 'normal',
    color: COLORS.textDark,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS,
    marginTop: SPACING.small,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.small,
  },
  monthDetailScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 7,
  },
  monthDetailList: {
    flex: 1,
  },
  itemHeader: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xsmall,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.large,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
  },
  txtContentText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  chartScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 7,
  },
  chartTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: SPACING.large,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  chartContainer: {
    borderRadius: BORDER_RADIUS,
    backgroundColor: COLORS.cardBackground,
    marginVertical: SPACING.small,
    paddingVertical: SPACING.small,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
  chartNoDataText: {
    textAlign: 'center',
    color: COLORS.textDark,
    marginTop: SPACING.large,
    fontSize: FONT_SIZES.medium,
  },
  successMessageContainer: {
    backgroundColor: COLORS.success,
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS,
    marginBottom: SPACING.medium,
    alignItems: 'center',
  },
  successMessageText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.medium,
  },
  filterButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.large,
    marginBottom: SPACING.medium,
    flexWrap: 'wrap',
    paddingHorizontal: 7,
  },
  filterButton: {
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: SPACING.xsmall,
    marginBottom: SPACING.small,
  },
  narrowFilterButton: {
    paddingHorizontal: SPACING.medium,
  },
  filterButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  filterButtonTextSelected: {
    color: COLORS.textLight,
  },
  reportFilterButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.medium,
    flexWrap: 'wrap', 
  },
  reportFilterButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border, 
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: 3, 
    marginBottom: SPACING.small, 
    minWidth: 90, 
  },
  reportFilterButtonWide: {
    minWidth: 115, 
  },
  reportFilterButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  reportFilterButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  reportFilterButtonTextSelected: {
    color: COLORS.textLight,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.medium,
  },
  modalActionButton: {
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large + 10,
    borderRadius: BORDER_RADIUS,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalActionButtonText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  reportContentText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  calendarContainer: {
    marginBottom: 100,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2.5,
      },
    }),
  },
});