'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { formatDateTime, convertToUTC } from '@/utils/dateUtils';

interface Repair {
  id: number;
  customer_id: number;
  bike_model: string;
  repair_start: string;
  repair_end: string | null;
  delivery_date: string | null;
  price: number;
  notes: string;
  status: 'pending' | 'in progress' | 'completed' | 'delivered' | 'canceled';
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
}

interface RepairUpdate {
  bike_model?: string;
  price?: number;
  notes?: string;
  status?: Repair['status'];
  repair_start?: string | null;
  repair_end?: string | null;
  delivery_date?: string | null;
}

// Status-related functions
const getStatusColor = (status: Repair['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'delivered':
      return 'bg-purple-100 text-purple-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RepairsHistoryPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [editedRepair, setEditedRepair] = useState<Partial<Repair>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRepairs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('repairs')
        .select('*')
        .in('status', ['canceled', 'delivered'])
        .order('repair_end', { ascending: false });

      if (error) throw error;
      setRepairs(data || []);
    } catch (error) {
      console.error('Error fetching repairs:', error);
      setError('Error al cargar las reparaciones');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Error al cargar los clientes');
    }
  }, [supabase]);

  useEffect(() => {
    fetchRepairs();
    fetchCustomers();
  }, [fetchRepairs, fetchCustomers]);

  const handleEditRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepair) return;

    try {
      const updateData: RepairUpdate = {
        bike_model: editedRepair.bike_model,
        price: editedRepair.price,
        notes: editedRepair.notes,
        status: editedRepair.status,
        repair_start: editedRepair.repair_start ? convertToUTC(new Date(editedRepair.repair_start)).toISOString() : null,
        repair_end: editedRepair.repair_end ? convertToUTC(new Date(editedRepair.repair_end)).toISOString() : null,
        delivery_date: editedRepair.delivery_date ? convertToUTC(new Date(editedRepair.delivery_date)).toISOString() : null
      };

      const { error } = await supabase
        .from('repairs')
        .update(updateData)
        .eq('id', editingRepair.id);

      if (error) {
        console.error('Error updating repair:', error);
        setError(`Error al actualizar la reparación: ${error.message}`);
        return;
      }

      setShowEditModal(false);
      setEditingRepair(null);
      setEditedRepair({});
      fetchRepairs();
    } catch (error) {
      console.error('Error updating repair:', error);
      setError(error instanceof Error ? error.message : 'Error inesperado al actualizar la reparación');
    }
  };

  const handleDeleteRepair = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reparación?')) return;

    try {
      const { error } = await supabase
        .from('repairs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting repair:', error);
        throw new Error(`Error deleting repair: ${error.message}`);
      }

      setRepairs(repairs.filter(repair => repair.id !== id));
      setSelectedRepair(null);
    } catch (error) {
      console.error('Error in handleDeleteRepair:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Historial de Reparaciones</h1>
        <Link
          href="/repairs"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a Reparaciones
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repairs.map((repair) => (
            <div 
              key={repair.id} 
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRepair(repair)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customers.find(c => c.id === repair.customer_id)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {repair.bike_model}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(repair.status)}`}>
                  {repair.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Inicio:
                  </span>
                  <span className="font-medium">
                    {repair.repair_start ? formatDateTime(repair.repair_start) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Entrega Estimada:
                  </span>
                  <span className="font-medium">
                    {repair.delivery_date ? formatDateTime(repair.delivery_date) : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    Precio:
                  </span>
                  <span className="font-medium">
                    {repair.price.toFixed(2)}€
                  </span>
                </div>
                {repair.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-2 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V19M19.5 19.5A2.5 2.5 0 0017 17H7a2.5 2.5 0 00-2.5 2.5M19.5 19.5V7A2.5 2.5 0 0017 4.5H7A2.5 2.5 0 004.5 7v12.5M19.5 19.5a2.5 2.5 0 01-2.5-2.5M4.5 19.5A2.5 2.5 0 007 17" />
                      </svg>
                      Notas:
                    </span>
                    <p className="text-sm text-gray-700 mt-1">{repair.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repair Details Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Detalles de la Reparación</h2>
              <button
                onClick={() => setSelectedRepair(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customers.find(c => c.id === selectedRepair.customer_id)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedRepair.bike_model}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedRepair.status)}`}>
                    {selectedRepair.status}
                  </span>
                  <button
                    onClick={() => {
                      setEditingRepair(selectedRepair);
                      setEditedRepair({
                        bike_model: selectedRepair.bike_model,
                        price: selectedRepair.price,
                        notes: selectedRepair.notes,
                        status: selectedRepair.status,
                        repair_start: selectedRepair.repair_start,
                        repair_end: selectedRepair.repair_end,
                        delivery_date: selectedRepair.delivery_date
                      });
                      setShowEditModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteRepair(selectedRepair.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha de Inicio</h4>
                  <p className="mt-1">{formatDateTime(selectedRepair.repair_start)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha de Fin</h4>
                  <p className="mt-1">{selectedRepair.repair_end ? formatDateTime(selectedRepair.repair_end) : 'No completada'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha de Entrega Estimada</h4>
                  <p className="mt-1">{selectedRepair.delivery_date ? formatDateTime(selectedRepair.delivery_date) : 'No asignada'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Precio</h4>
                  <p className="mt-1">{selectedRepair.price.toFixed(2)}€</p>
                </div>
              </div>

              {selectedRepair.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Notas</h4>
                  <p className="mt-1 text-gray-700">{selectedRepair.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-lg md:p-6 overflow-y-auto">
            <div className="p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-4">Editar Reparación</h2>
              <form onSubmit={handleEditRepair}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bike_model">
                    Modelo de Bicicleta
                  </label>
                  <input
                    type="text"
                    id="bike_model"
                    value={editedRepair.bike_model || editingRepair.bike_model}
                    onChange={(e) => setEditedRepair({ ...editedRepair, bike_model: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                    Precio
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={editedRepair.price || editingRepair.price}
                    onChange={(e) => setEditedRepair({ ...editedRepair, price: parseFloat(e.target.value) })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                    Estado
                  </label>
                  <select
                    id="status"
                    value={editedRepair.status || editingRepair.status}
                    onChange={(e) => setEditedRepair({ ...editedRepair, status: e.target.value as Repair['status'] })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in progress">En Progreso</option>
                    <option value="completed">Completada</option>
                    <option value="delivered">Entregada</option>
                    <option value="canceled">Cancelada</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="repair_start">
                    Fecha de Inicio
                  </label>
                  <input
                    type="datetime-local"
                    id="repair_start"
                    value={editedRepair.repair_start || editingRepair.repair_start || ''}
                    onChange={(e) => setEditedRepair({ ...editedRepair, repair_start: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="repair_end">
                    Fecha de Finalización
                  </label>
                  <input
                    type="datetime-local"
                    id="repair_end"
                    value={editedRepair.repair_end || editingRepair.repair_end || ''}
                    onChange={(e) => setEditedRepair({ ...editedRepair, repair_end: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="delivery_date">
                    Fecha de Entrega
                  </label>
                  <input
                    type="datetime-local"
                    id="delivery_date"
                    value={editedRepair.delivery_date || editingRepair.delivery_date || ''}
                    onChange={(e) => setEditedRepair({ ...editedRepair, delivery_date: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
                    Notas
                  </label>
                  <textarea
                    id="notes"
                    value={editedRepair.notes || editingRepair.notes || ''}
                    onChange={(e) => setEditedRepair({ ...editedRepair, notes: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRepair(null);
                      setEditedRepair({});
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 