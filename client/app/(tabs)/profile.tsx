import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { dummyUserProfile } from '@/assets/assets'
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/assets/styles/ProfileScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker'
import { api, useApp } from '@/context/AppContext';

export default function profile() {

  const { auth, logout, updateUser } = useApp()
  const user = auth.user;
  const [editMode, setEditMode] = useState(false)
  const [profileName, setProfileName] = useState(auth.user?.name || "")
  const [profileHandle, setProfileHandle] = useState(auth.user?.handle || "")
  const [profileBio, setProfileBio] = useState(auth.user?.bio || "")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedAvatar, setSavedAvatar] = useState<string | null>(user?.avatar || null)

  const displayAvatar = avatarUrl || savedAvatar || user?.avatar
  
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status === 'granted') {
      Alert.alert("Permission needed", "Allow access to your photos and change avatar");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1,1]
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUrl(result.assets[0].uri)
    }
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('handle', profileHandle);
      formData.append('bio', profileBio);
      if (avatarUrl) {
        formData.append('avatar', {
          uri: avatarUrl,
          type: "image/jpeg",
          name: "avatar.jpg"
        } as any)
      }

      const {data} = await api.put('/api/users/profile', formData, {
        headers: { "Content-Type": "multipart/form-data"}
      })
      if (data.success) {
        await updateUser(data.user)
        if(data.user.avatar) setSavedAvatar(data.user.avatar)
          Alert.alert("Success", "Profile Updated!")
        setEditMode(false)
        setAvatarUrl(null)
      }
    } catch (err: any) {
      Alert.alert("Error",err?.response?.data?.message ||  "Failed to update profile")
    }finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?",[
      {text: "Cancel", style:'cancel'},
      {text: "Sign Out", style:"destructive", onPress: logout},
    ])
  }

  const getUser = async () => {
    try {
      const {data} = await api.get("/api/users/profile")
      setProfileName(data.user.name)
      setProfileHandle(data.user.handle)
      setProfileBio(data.user.bio)
      if(data.user.avatar) {
        setSavedAvatar(data.user.avatar)
        setAvatarUrl(null)
      }
    } catch (err: any) {
      console.log(err.message);
    }
  }

  useEffect(()=>{
    getUser()
  },[])

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!editMode && (
            <TouchableOpacity style={styles.editBtn} onPress={()=>setEditMode(true)}>
              <Ionicons name='pencil' size={16} color={Colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={editMode ? pickAvatar : undefined} activeOpacity={editMode ? 0.7 : 1}> 
              <View style={styles.avatarWrapper}>
                <Avatar name={user?.name || "?"} src={displayAvatar} size={100} />
                { editMode && (
                  <View style={styles.cameraOverlay}>
                      <Ionicons name='camera' size={22} color='#fff' />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {!editMode && (
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{profileName}</Text>
                <Text style={styles.userHandle}>@{profileHandle}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                {user?.bio && <Text style={styles.userBio}>{profileBio}</Text>}
                
              </View>
            )}
          </View>

        {/* Edit Form */}
            {editMode && (
              <View style={styles.form}>

                {/* Name */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>NAME</Text>
                  <TextInput
                  style={styles.input}
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder='Your Name'
                  placeholderTextColor={Colors.outlineVariant}
                  autoCapitalize='words' />
                </View>


                {/* Handle */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>HANDLE</Text>
                  <View style={styles.handleRow}>
                    <Text style={styles.atSign}>@</Text>
                    <TextInput
                  style={[styles.input, styles.handleInput]}
                  value={profileHandle}
                  onChangeText={(v)=>setProfileHandle(v.toLowerCase().replace(/\s/g, ""))}
                  placeholder='username'
                  placeholderTextColor={Colors.outlineVariant}
                  autoCapitalize='none' />
                  </View>
                  
                </View>


                {/* Bio */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>BIO</Text>
                  <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={profileBio}
                  onChangeText={setProfileBio}
                  placeholder='Tell us about yourself..'
                  placeholderTextColor={Colors.outlineVariant}
                  multiline
                  numberOfLines={3} />
                </View>

                {/* Save Button */}
                <TouchableOpacity onPress={saveProfile} disabled={loading} style={styles.saveWrapper} activeOpacity={0.88}>
                  <LinearGradient
                  colors={[Colors.primary, Colors.primaryContainer]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.saveBtn}>
                    {loading ? (
                      <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity style={styles.cancelBtn} onPress={()=> {
                  setEditMode(false)
                  setAvatarUrl(null)
                }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

        {/* Profile Options */}

          {!editMode && (
            <View style={styles.optionsSection}>
              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionIcon}>
                  <Ionicons name='settings-outline' size={20} color={Colors.onSurfaceVariant} />
                </View>
                <Text style={styles.optionText}>Settings</Text>
                <Ionicons name='chevron-forward' size={16} color={Colors.outlineVariant} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionIcon}>
                  <Ionicons name='notifications-outline' size={20} color={Colors.onSurfaceVariant} />
                </View>
                <Text style={styles.optionText}>Notifications</Text>
                <Ionicons name='chevron-forward' size={16} color={Colors.outlineVariant} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionIcon}>
                  <Ionicons name='lock-closed-outline' size={20} color={Colors.onSurfaceVariant} />
                </View>
                <Text style={styles.optionText}>Privacy & Security</Text>
                <Ionicons name='chevron-forward' size={16} color={Colors.outlineVariant} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionIcon}>
                  <Ionicons name='help-circle-outline' size={20} color={Colors.onSurfaceVariant} />
                </View>
                <Text style={styles.optionText}>Help & Support</Text>
                <Ionicons name='chevron-forward' size={16} color={Colors.outlineVariant} />
              </TouchableOpacity>
            </View>
          )}

        {/* Sign Out */}

        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name='log-out-outline' size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}