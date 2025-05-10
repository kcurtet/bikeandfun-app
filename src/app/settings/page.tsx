'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BikeType {
  id: number;
  type_name: string;
  description: string;
}

interface RentalPricing {
  id: number;
  bike_type_id: number;
  duration: number;
  duration_unit: 'hour' | 'day' | 'week';
  price: number;
}

export default function SettingsPage() {
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [rentalPricing, setRentalPricing] = useState<RentalPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddBikeTypeModal, setShowAddBikeTypeModal] = useState(false);
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [selectedBikeType, setSelectedBikeType] = useState<string>('');
  const [newBikeType, setNewBikeType] = useState({ type_name: '', description: '' });
  const [newPricing, setNewPricing] = useState({
    bike_type_id: '',
    duration: '',
    duration_unit: 'hour',
    price: '',
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBikeTypes();
    fetchRentalPricing();
  }, []);

  const fetchBikeTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('bike_types')
        .select('*')
        .order('type_name');

      if (error) throw error;
      setBikeTypes(data || []);
    } catch (error) {
      console.error('Error fetching bike types:', error);
      setError('Error al cargar los tipos de bicicletas');
    }
  };

  const fetchRentalPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_pricing')
        .select('*');

      if (error) throw error;
      
      // Ordenar los datos en el cliente por tipo y duración normalizada
      const sortedData = data?.sort((a, b) => {
        // Primero ordenar por tipo de bicicleta
        if (a.bike_type_id !== b.bike_type_id) {
          return a.bike_type_id - b.bike_type_id;
        }
        
        // Si es el mismo tipo, ordenar por duración
        const getMinutes = (pricing: RentalPricing) => {
          const duration = pricing.duration;
          switch (pricing.duration_unit) {
            case 'hour': return duration * 60;
            case 'day': return duration * 24 * 60;
            case 'week': return duration * 7 * 24 * 60;
            default: return 0;
          }
        };
        
        return getMinutes(a) - getMinutes(b);
      });

      setRentalPricing(sortedData || []);
    } catch (error) {
      console.error('Error fetching rental pricing:', error);
      setError('Error al cargar los precios de alquiler');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBikeType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('bike_types')
        .insert([newBikeType]);

      if (error) throw error;
      setShowAddBikeTypeModal(false);
      setNewBikeType({ type_name: '', description: '' });
      fetchBikeTypes();
    } catch (error) {
      console.error('Error adding bike type:', error);
      setError('Error al agregar el tipo de bicicleta');
    }
  };

  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('rental_pricing')
        .insert([{
          ...newPricing,
          bike_type_id: parseInt(newPricing.bike_type_id),
          duration: parseInt(newPricing.duration),
          price: parseFloat(newPricing.price),
        }]);

      if (error) throw error;
      setShowAddPricingModal(false);
      setNewPricing({
        bike_type_id: '',
        duration: '',
        duration_unit: 'hour',
        price: '',
      });
      fetchRentalPricing();
    } catch (error) {
      console.error('Error adding pricing:', error);
      setError('Error al agregar el precio de alquiler');
    }
  };

  const handleDeleteBikeType = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este tipo de bicicleta?')) return;

    try {
      const { error } = await supabase
        .from('bike_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBikeTypes();
    } catch (error) {
      console.error('Error deleting bike type:', error);
      setError('Error al eliminar el tipo de bicicleta');
    }
  };

  const handleDeletePricing = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este precio de alquiler?')) return;

    try {
      const { error } = await supabase
        .from('rental_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRentalPricing();
    } catch (error) {
      console.error('Error deleting pricing:', error);
      setError('Error al eliminar el precio de alquiler');
    }
  };

  const filteredPricing = selectedBikeType
    ? rentalPricing.filter(pricing => pricing.bike_type_id === parseInt(selectedBikeType))
    : rentalPricing;

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Configuración</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bike Types Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Tipos de Bicicletas</h2>
            <button
              onClick={() => setShowAddBikeTypeModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Agregar Tipo
            </button>
          </div>

          <div className="space-y-4">
            {bikeTypes.map((type) => (
              <div key={type.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-base font-medium text-gray-900">{type.type_name}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteBikeType(type.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rental Pricing Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Precios de Alquiler</h2>
            <button
              onClick={() => setShowAddPricingModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Agregar Precio
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="filter_bike_type">
              Filtrar por tipo de bicicleta
            </label>
            <select
              id="filter_bike_type"
              value={selectedBikeType}
              onChange={(e) => setSelectedBikeType(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
            >
              <option value="">Todos los tipos</option>
              {bikeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredPricing.map((pricing) => (
              <div key={pricing.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-base font-medium text-gray-900">
                    {bikeTypes.find(type => type.id === pricing.bike_type_id)?.type_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {pricing.duration} {pricing.duration_unit}{pricing.duration > 1 ? 's' : ''} - {pricing.price.toFixed(2)}€
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePricing(pricing.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Bike Type Modal */}
      {showAddBikeTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Agregar Tipo de Bicicleta</h2>
            <form onSubmit={handleAddBikeType}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  value={newBikeType.type_name}
                  onChange={(e) => setNewBikeType({ ...newBikeType, type_name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Descripción
                </label>
                <textarea
                  id="description"
                  value={newBikeType.description}
                  onChange={(e) => setNewBikeType({ ...newBikeType, description: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBikeTypeModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Pricing Modal */}
      {showAddPricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Agregar Precio de Alquiler</h2>
            <form onSubmit={handleAddPricing}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bike_type">
                  Tipo de Bicicleta
                </label>
                <select
                  id="bike_type"
                  value={newPricing.bike_type_id}
                  onChange={(e) => setNewPricing({ ...newPricing, bike_type_id: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  {bikeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.type_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration">
                  Duración
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="duration"
                    value={newPricing.duration}
                    onChange={(e) => setNewPricing({ ...newPricing, duration: e.target.value })}
                    className="shadow appearance-none border rounded w-1/2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    min="1"
                    required
                  />
                  <select
                    value={newPricing.duration_unit}
                    onChange={(e) => setNewPricing({ ...newPricing, duration_unit: e.target.value as 'hour' | 'day' | 'week' })}
                    className="shadow appearance-none border rounded w-1/2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="hour">Hora(s)</option>
                    <option value="day">Día(s)</option>
                    <option value="week">Semana(s)</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                  Precio (€)
                </label>
                <input
                  type="number"
                  id="price"
                  value={newPricing.price}
                  onChange={(e) => setNewPricing({ ...newPricing, price: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPricingModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 