import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Image, TextInput , Alert } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { styles } from '@/assets/styles/ChatScreen.styles'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/Colors'
import { formatTime } from '@/utils/formatTime'
import Avatar from '@/components/Avatar'
import Bubble from '@/components/Bubble'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { api, useApp } from '@/context/AppContext'
import { Message } from '@/types'

export default function ChatScreen() {

  const {id} = useLocalSearchParams<{id: string}>()
  const router = useRouter()
  let {auth, messages, users, selectedConversations, typingUsers, setConversations,setSelectedConversations, setMessages, sendWsEvent} = useApp()

  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaMime, setMediaMime] = useState<string>('image/jpeg')
  const [mediaName, setMediaName] = useState<string>('media.jpg')

  const flatListRef = useRef<FlatList>(null)
  const typingTimeRef = useRef<ReturnType<typeof setTimeout>>(null)

  const partner = selectedConversations?.participant;

  useEffect(()=>{
    if(!id) return;
    setLoading(true)
    const fetchMessages = () => {
      api.get(`/api/messages/conversations/${id}/messages`).then(({data})=> {
        if (data.success) {
          setMessages(data.messages);
          setLoading(false)
        }
      }) .catch(()=>{
        setTimeout(fetchMessages, 1000)
      })
    }
    fetchMessages()
  }, [id])

  useEffect(()=> {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true}), 100);
    }
  },[messages])

  const deleteChat = () => {
    const msg = `Delete this chat> This cannot be undone.`;
    Alert.alert("Delete Chat", msg, [
      { text: "Cancel", style: 'cancel'},
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { data } = await api.delete(`/api/messages/conversations/${selectedConversations?._id}`)
            if (data.success) {
              setConversations((prev)=>prev.filter((c)=>c._id !== selectedConversations?._id))
              setSelectedConversations(null);
              router.back()
            }
          } catch (error) {
            Alert.alert("Error"," Failed to deleteChat ")
          }
        }
      }
    ])
  }

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
        if (status === 'granted') {
          Alert.alert("Permission needed", "Allow photo access to send media");
          return;
        }
    
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
           const asset = result.assets[0];
           setMediaUrl(asset.uri)
           setMediaMime(asset.mimeType || "image/jpeg");
           setMediaName(asset.fileName || (asset.mimeType?.startsWith("video") ? "video.mp4" : "photo.jpg"))
        }
  }

  const send = async () => {
    if (!text.trim() && !mediaUrl || !selectedConversations) return; 
    setSending(true)
   try {
    const formData = new FormData();
    formData.append("receiverId", partner!._id);
    if(text.trim()) formData.append("text", text.trim());
    if (mediaUrl) {
      formData.append("file", {url: mediaUrl, type: mediaMime, name: mediaName} as any)
    }
    const {data} = await api.post<{success: boolean, message: Message}>('/api/messages/send', formData, {
      headers: {"Content-Type" : "multipart/form-data"}
    })
    if (data.success) {
      setMessages((prev)=>[...prev, data.message]);
      const target = {receiverId: partner!._id};
      sendWsEvent({ type: "message", ...target, payload: data.message})
      setText("")
      setMediaUrl(null)
    }
   } catch (err: any) {
    Alert.alert("Error", err?.response?.data?.message || "Failed to send message")
   }finally {
    setLoading(false)
   }
  }

  const handleTyping = (val: string) => {
    setText(val)
    const target = { receiverId: partner?._id};
    if(!target.receiverId) return;

    sendWsEvent({type: "typing", ...target, isTyping: true});

    if (typingTimeRef.current) clearTimeout(typingTimeRef.current)
      typingTimeRef.current = setTimeout(()=> {
        sendWsEvent({type: "typing", ...target, isTyping: false})
  }, 1500) 
  }

  const typingEntries = Object.entries(typingUsers).filter(([uid, isTyping]) => {
    if(!isTyping  || uid === auth.user?._id) return false;
    return partner?._id === uid
  })



  if (!selectedConversations) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={()=> router.back()}>
          <Ionicons name='chevron-back' size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Ionicons name='chatbubbles-outline' size={52} color={Colors.outlineVariant} />
          <Text style={styles.emptyText}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const headerName = partner!.name;
  const headerAvatar = partner!.avatar;
  const headerSub= partner!.isOnline ? "Online" : partner?.lastSeen ? `Last Seen ${formatTime(partner.lastSeen)}` : "Offline";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={()=> router.back()}>
          <Ionicons name='chevron-back' size={24} color={Colors.onSurface} />
      </TouchableOpacity>

      <Avatar name={headerName} src={headerAvatar} size={38} online={partner?.isOnline} />

      <View style={styles.headerInfo}>
        <Text style={styles.headerName} numberOfLines={1}>
          {headerName}
          <Text style={styles.headerHandle}>@{partner?.handle}</Text>
        </Text>
        <Text style={[styles.headerSub, partner?.isOnline && {color: Colors.online}]}>{headerSub}</Text>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name='call-outline' size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name='videocam-outline' size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={deleteChat}>
          <Ionicons name='trash-outline' size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>

    {/* main */}
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'android' ? 'padding' : "height"} keyboardVerticalOffset={Platform.OS === 'android' ? 90 : 0}>

      {/* Messages */}

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
        ): (
          <FlatList data={messages}
          ref={flatListRef}
          keyExtractor={(m)=>m._id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item: msg, index}) => {
            const isMine = msg.sender === auth.user?._id;
            const prev = messages[index - 1];
            const showGap = !prev || prev.sender !== msg.sender;
            return (
              <View style={showGap && index > 0 ? {marginTop: 10} : {}}>
                <Bubble msg={msg} isMine={isMine} />
              </View>
            )
          }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: false})}
          />
        )}


      {/* Typing Indicator */}
      {typingEntries.length > 0 && (
        <View style={styles.typingRow}>
          {typingEntries.map(([uid])=>{
            const u = users.find((x)=>x._id === uid) || partner;
            return (
              <Text key={uid} style={styles.typingText}>{u?.name || "Someone"} is typing...</Text>
            )

          })}
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        {mediaUrl && (
          <View style={styles.mediaPreview}>
            <Image source={{uri: mediaUrl}} style={styles.mediaThumb} />
            <TouchableOpacity style={styles.mediaRemove} onPress={() => setMediaUrl(null)}>
              <Ionicons name='close-circle' size={20} color='#fff' />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickMedia}>
              <Ionicons name='image-outline' size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TextInput style={styles.textInput}
          value={text}
          onChangeText={handleTyping}
          placeholder='Message...'
          placeholderTextColor={Colors.outlineVariant}
          multiline
          maxLength={2000}
          />

          <TouchableOpacity disabled={!text.trim() && !mediaUrl || sending} activeOpacity={0.85} onPress={send}>
            <LinearGradient colors={[Colors.primary, Colors.primaryContainer]} style={[styles.sendBtn, !text.trim() && !mediaUrl && styles.sendBtnDisabled]}>
              {sending ? (
                <ActivityIndicator color='#fff' size='small' />
              ) : (
                <Ionicons name='send' size={16} color='#fff' />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>

          
    </SafeAreaView>
  )
}