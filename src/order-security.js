const ORDER_FLOW = {
  requested: ['assigned', 'rejected'],
  assigned: ['en_route', 'rejected'],
  en_route: ['picked_up'],
  picked_up: ['at_plant'],
  at_plant: ['completed']
};

const ORDER_STRING_FIELDS = new Set([
  'id',
  'providerId',
  'providerOrg',
  'wasteType',
  'shift',
  'plantId',
  'plantName',
  'status',
  'riderId',
  'riderName',
  'quality',
  'txHash'
]);

const ORDER_NUMBER_FIELDS = new Set([
  'ts',
  'providerLat',
  'providerLng',
  'kg',
  'actualKg',
  'segScore',
  'tokensMinted'
]);

const ROLE_ROOM_MAP = {
  provider: 'providers_room',
  rider: 'riders_room',
  plant: 'plants_room',
  admin: 'admin_room'
};

function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

function uniqueRooms(rooms = []) {
  return Array.from(new Set(rooms.filter(Boolean)));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value, fallback = '') {
  return value == null ? fallback : String(value);
}

function normalizeOrderDocument(doc = {}) {
  const normalized = { ...doc };

  ORDER_STRING_FIELDS.forEach((field) => {
    if (field in normalized) {
      normalized[field] = toString(normalized[field], '');
    }
  });

  ORDER_NUMBER_FIELDS.forEach((field) => {
    if (field in normalized) {
      normalized[field] = toNumber(normalized[field], 0);
    }
  });

  return normalized;
}

function getSessionId(session) {
  return toString(session?.id, '');
}

function isAdmin(session) {
  return normalizeRole(session?.role) === 'admin';
}

function getSessionRooms(session) {
  const rooms = ['network_room'];
  const role = normalizeRole(session?.role);

  if (role && ROLE_ROOM_MAP[role]) {
    rooms.push(ROLE_ROOM_MAP[role]);
  }

  if (getSessionId(session)) {
    rooms.push(`session:${getSessionId(session)}`);
  }

  if (isAdmin(session)) {
    rooms.push('admin_room');
  }

  return uniqueRooms(rooms);
}

function getOrderParticipantRooms(order, includeRequestedAudience = false) {
  const rooms = ['network_room'];
  if (order?.providerId) rooms.push(`session:${order.providerId}`);
  if (order?.riderId) rooms.push(`session:${order.riderId}`);
  if (order?.plantId) rooms.push(`session:${order.plantId}`);
  if (includeRequestedAudience) rooms.push('riders_room');
  return uniqueRooms(rooms);
}

function validateOrderIntegrity(order, { requireTerminalDetails = false } = {}) {
  const normalized = normalizeOrderDocument(order);

  if (!normalized.id) {
    return { ok: false, reason: 'Missing order id.' };
  }

  if (!normalized.providerId) {
    return { ok: false, reason: 'Missing provider owner.' };
  }

  if (!normalized.plantId) {
    return { ok: false, reason: 'Missing plant assignment.' };
  }

  if (!normalized.status || !['requested', 'assigned', 'en_route', 'picked_up', 'at_plant', 'completed', 'rejected'].includes(normalized.status)) {
    return { ok: false, reason: 'Invalid order status.' };
  }

  if (normalized.kg < 0) {
    return { ok: false, reason: 'Order weight cannot be negative.' };
  }

  if (normalized.actualKg < 0) {
    return { ok: false, reason: 'Collected weight cannot be negative.' };
  }

  if (normalized.segScore < 0 || normalized.segScore > 100) {
    return { ok: false, reason: 'Segregation score must be between 0 and 100.' };
  }

  if (normalized.status === 'requested' && (normalized.actualKg > 0 || normalized.segScore > 0)) {
    return { ok: false, reason: 'Requested orders cannot include pickup metrics.' };
  }

  if (normalized.status === 'completed') {
    if (!(normalized.actualKg > 0)) {
      return { ok: false, reason: 'Completed orders require a collected weight.' };
    }

    if (!Number.isFinite(normalized.segScore)) {
      return { ok: false, reason: 'Completed orders require a segregation score.' };
    }
  }

  if (requireTerminalDetails && normalized.status !== 'completed' && normalized.status !== 'rejected') {
    return { ok: false, reason: 'Only terminal orders can be removed from sync.' };
  }

  return { ok: true, order: normalized };
}

function validateOrderWrite({ currentOrder = null, nextOrder = null, session = null, operation = 'save' } = {}) {
  if (!nextOrder) {
    return { ok: false, reason: 'Missing order payload.' };
  }

  const normalizedNext = normalizeOrderDocument(nextOrder);
  const normalizedCurrent = currentOrder ? normalizeOrderDocument(currentOrder) : null;
  const role = normalizeRole(session?.role);
  const sessionId = getSessionId(session);

  const integrity = validateOrderIntegrity(normalizedNext, { requireTerminalDetails: operation === 'delete' });
  if (!integrity.ok) {
    return integrity;
  }

  if (role === 'admin') {
    return {
      ok: true,
      order: normalizedNext,
      rooms: getOrderParticipantRooms(normalizedNext, normalizedNext.status === 'requested')
    };
  }

  if (operation === 'delete') {
    if (!normalizedCurrent) {
      return { ok: false, reason: 'Missing existing order for delete.' };
    }

    if (normalizedCurrent.status !== 'completed') {
      return { ok: false, reason: 'Only completed orders can be deleted.' };
    }

    if (role === 'provider' && normalizedCurrent.providerId === sessionId) {
      return { ok: true, order: normalizedCurrent, rooms: getOrderParticipantRooms(normalizedCurrent) };
    }

    if (role === 'rider' && normalizedCurrent.riderId === sessionId) {
      return { ok: true, order: normalizedCurrent, rooms: getOrderParticipantRooms(normalizedCurrent) };
    }

    if (role === 'plant' && normalizedCurrent.plantId === sessionId) {
      return { ok: true, order: normalizedCurrent, rooms: getOrderParticipantRooms(normalizedCurrent) };
    }

    return { ok: false, reason: 'You cannot delete this order.' };
  }

  if (!normalizedCurrent) {
    if (role !== 'provider') {
      return { ok: false, reason: 'Only providers can create orders.' };
    }

    if (normalizedNext.providerId !== sessionId) {
      return { ok: false, reason: 'Providers can only create their own orders.' };
    }

    if (normalizedNext.status !== 'requested') {
      return { ok: false, reason: 'New orders must start in requested state.' };
    }

    return {
      ok: true,
      order: normalizedNext,
      rooms: getOrderParticipantRooms(normalizedNext, true)
    };
  }

  if (normalizedCurrent.providerId !== normalizedNext.providerId || normalizedCurrent.plantId !== normalizedNext.plantId) {
    return { ok: false, reason: 'Order ownership cannot be reassigned.' };
  }

  const currentStatus = normalizedCurrent.status;
  const nextStatus = normalizedNext.status;
  const allowedNext = ORDER_FLOW[currentStatus] || [];

  if (currentStatus !== nextStatus && !allowedNext.includes(nextStatus)) {
    return { ok: false, reason: `Illegal order transition from ${currentStatus} to ${nextStatus}.` };
  }

  if (role === 'provider') {
    if (normalizedCurrent.providerId !== sessionId) {
      return { ok: false, reason: 'Providers can only modify their own orders.' };
    }

    if (!(currentStatus === 'requested' && nextStatus === 'rejected')) {
      return { ok: false, reason: 'Providers can only cancel requested orders.' };
    }

    return {
      ok: true,
      order: normalizedNext,
      rooms: getOrderParticipantRooms(normalizedCurrent, true)
    };
  }

  if (role === 'rider') {
    const riderId = normalizedCurrent.riderId || normalizedNext.riderId;
    const sameRider = riderId && riderId === sessionId;

    if (currentStatus === 'requested') {
      if (!(nextStatus === 'assigned' && normalizedNext.riderId === sessionId)) {
        return { ok: false, reason: 'Riders can only accept requested orders assigned to themselves.' };
      }

      return {
        ok: true,
        order: normalizedNext,
        rooms: getOrderParticipantRooms(normalizedNext)
      };
    }

    if (!sameRider) {
      return { ok: false, reason: 'Riders can only update their assigned orders.' };
    }

    if (!allowedNext.includes(nextStatus)) {
      return { ok: false, reason: 'Riders cannot skip workflow steps.' };
    }

    return {
      ok: true,
      order: normalizedNext,
      rooms: getOrderParticipantRooms(normalizedNext)
    };
  }

  if (role === 'plant') {
    if (normalizedCurrent.plantId !== sessionId) {
      return { ok: false, reason: 'Plants can only update their assigned orders.' };
    }

    if (!(currentStatus === 'at_plant' && nextStatus === 'completed')) {
      return { ok: false, reason: 'Plants can only complete orders at the plant gate.' };
    }

    return {
      ok: true,
      order: normalizedNext,
      rooms: getOrderParticipantRooms(normalizedNext)
    };
  }

  return { ok: false, reason: 'You are not allowed to modify this order.' };
}

function resolveOrderRooms({ currentOrder = null, nextOrder = null, session = null, operation = 'save' } = {}) {
  const result = validateOrderWrite({ currentOrder, nextOrder, session, operation });
  if (result.ok) {
    return result.rooms || getOrderParticipantRooms(result.order, result.order?.status === 'requested');
  }
  return getSessionRooms(session);
}

function filterRequestedRooms(requestedRooms = [], session = null) {
  const allowed = new Set(getSessionRooms(session));
  return uniqueRooms(['network_room', ...requestedRooms]).filter((room) => allowed.has(room) || room === 'network_room');
}

function resolveEventRooms({ session = null, requestedRooms = [], currentOrder = null, nextOrder = null, eventType = '', operation = 'event' } = {}) {
  if (currentOrder || nextOrder || operation === 'delete') {
    return resolveOrderRooms({ currentOrder, nextOrder, session, operation });
  }

  if (eventType === 'KPI_UPDATED' || eventType === 'SYNC_UPDATED') {
    return filterRequestedRooms(requestedRooms, session);
  }

  return getSessionRooms(session);
}

export const OrderSecurity = {
  normalizeOrderDocument,
  validateOrderIntegrity,
  validateOrderWrite,
  resolveOrderRooms,
  resolveEventRooms,
  getSessionRooms,
  getOrderParticipantRooms,
  filterRequestedRooms
};
