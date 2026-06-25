import { View, Text, TouchableOpacity, Linking, Image } from 'react-native'
import React from 'react'
import { Message } from '@/types'
import { styles } from '@/assets/styles/Bubble.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { useVideoPlayer, VideoView } from 'expo-video';
import { formatTime } from '@/utils/formatTime';
import { Ionicons } from '@expo/vector-icons';

interface BubbleProps {
    msg: Message;
    isMine: boolean;
}

export default function Bubble({ msg, isMine}: BubbleProps ) {

    const content = <BubbleContent msg={msg} isMine={isMine} />

  return (
    <View style={[styles.row, isMine ? styles.rowMe : styles.rowThem]}>
      {isMine ? (
        <LinearGradient
        colors={[Colors.primary, Colors.primaryContainer]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.bubble, styles.bubbleMe]}>
            {content}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleThem]}>{content}</View>
      )}
    </View>
  )
}

function BubbleContent({msg, isMine} :{ msg: Message, isMine: boolean} ){
    return(
        <View>
            {msg.mediaUrl && (
                <View style={styles.mediaWrapper}>
                    {msg.mediaType === 'image' ? (
                        <TouchableOpacity onPress={()=> Linking.openURL(msg.mediaUrl!)}>
                        <Image source={{uri: msg.mediaUrl}} style={styles.mediaImage} resizeMode='cover' />
                    </TouchableOpacity>
                    ) : (
                        <VideoPlayer uri={msg.mediaUrl} style={styles.mediaVideo} />
                    )}
                    
                </View>
            )}

            {msg.text && <Text style={[styles.msgText, isMine ? styles.msgTextMe : styles.msgTextThem]}>{msg.text}</Text>}

            <View style={[styles.footer, isMine ? styles.footerRight : styles.footerLeft]}>
                <Text style={[styles.timeText, isMine ? styles.timeMe : styles.timeThem]}>{formatTime(msg.createdAt)}</Text>

                { isMine && (
                    <Ionicons name={msg.read ? "checkmark-done" : "checkmark"} size={12} color={msg.read ? Colors.onPrimary : `${Colors.onPrimary}88`} />
                )}
            </View>
        </View>
    )
}

function VideoPlayer({ uri, style} : {uri: string, style: any}) {
    const player = useVideoPlayer({uri}, (p) => {
        p.loop = false
    })
    return <VideoView player={player} style={style} nativeControls />
}