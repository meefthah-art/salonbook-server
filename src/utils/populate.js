const { ObjectId } = require("mongodb");
const { getDB } = require("../db");

const onlyValid = (ids) => ids.filter((id) => ObjectId.isValid(id));

async function getUsersMap(ids) {
  const unique = [...new Set(ids)];
  const query = { _id: { $in: [...onlyValid(unique).map((id) => new ObjectId(id)), ...unique] } };
  const users = await getDB().collection("users").find(query).toArray();
  const map = {};
  users.forEach((u) => {
    map[String(u._id)] = { id: String(u._id), name: u.name, email: u.email, image: u.image, phone: u.phone };
  });
  return map;
}

async function getServicesMap(ids) {
  const unique = onlyValid([...new Set(ids)]);
  const services = await getDB().collection("services").find({ _id: { $in: unique.map((id) => new ObjectId(id)) } }).toArray();
  const map = {};
  services.forEach((s) => (map[String(s._id)] = s));
  return map;
}

async function addServiceAndCustomer(appointments, withCustomer = true) {
  const servicesMap = await getServicesMap(appointments.map((a) => a.serviceId));
  const usersMap = withCustomer ? await getUsersMap(appointments.map((a) => a.customerId)) : {};
  return appointments.map((a) => ({
    ...a,
    service: servicesMap[a.serviceId] || null,
    customer: usersMap[a.customerId] || null,
  }));
}

module.exports = { addServiceAndCustomer, getUsersMap, getServicesMap };
