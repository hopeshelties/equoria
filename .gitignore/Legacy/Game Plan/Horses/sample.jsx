import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Animated } from 'react-native';
import { Tabs, TabScreen } from 'react-native-paper-tabs';

const HorseProfile = ({ horse }) => {
  const [geneticsModalVisible, setGeneticsModalVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const openGeneticsModal = () => {
    setGeneticsModalVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };
  const closeGeneticsModal = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setGeneticsModalVisible(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Horse Header */}
      <View style={{ alignItems: 'center', padding: 16, backgroundColor: '#8b5a2b' }}>
        <Image source={{ uri: horse.image_url }} style={{ width: 150, height: 150, borderRadius: 10 }} />
        <Text style={{ fontSize: 24, fontFamily: 'PressStart2P', color: '#fff' }}>{horse.name}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Roboto', color: '#fff' }}>
          {horse.sex} | Age: {horse.age} | Color: {horse.final_display_color}
        </Text>
        <TouchableOpacity onPress={openGeneticsModal}>
          <Text style={{ fontSize: 14, color: '#ffd700', textDecorationLine: 'underline' }}>Genetics</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <Tabs>
        <TabScreen label="Overview">
          <View style={{ padding: 16 }}>
            <Text>Trait: {horse.trait}</Text>
            <Text>Temperament: {horse.temperament}</Text>
            <Text>Health: {horse.health}</Text>
            <Text>Last Fed: {horse.last_fed}</Text>
            <Text>Last Shod: {horse.last_shod}</Text>
            <Text>Last Vetted: {horse.last_vetted}</Text>
          </View>
        </TabScreen>
        <TabScreen label="Training">{/* Training content */}</TabScreen>
        <TabScreen label="Breeding">{/* Breeding content */}</TabScreen>
        <TabScreen label="Stats">{/* Stats content */}</TabScreen>
        <TabScreen label="Pedigree">{/* Pedigree content */}</TabScreen>
        <TabScreen label="Shows">{/* Shows content */}</TabScreen>
      </Tabs>

      {/* Genetics Modal */}
      <Modal visible={geneticsModalVisible} transparent>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', opacity: fadeAnim }}>
          <View style={{ backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 10 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Roboto' }}>Genetics</Text>
            <Text>{JSON.stringify(horse.genotype, null, 2)}</Text>
            <TouchableOpacity onPress={closeGeneticsModal}>
              <Text style={{ color: '#ff0000', textAlign: 'right' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
};