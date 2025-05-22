const mongoose = require('mongoose');
const Message = require('../../models/message');

const get = async (id, project) => {
    let result = await Message.findById(id, project);
    return result;
};
const findOne = async (query) => {
    const result = await Message.findOne(query);
    return result;
};
const findMany = async (userId, otherUserId) => {
    let result = await Message.find({
      chatType: 'one2one',
      isDeleted: { $ne: true },
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });
    return result;
};

const create = async (data) => {
    let result = await Message.create(data);
    return result;
};
const findByIdAndUpdate = async (id, data) => {
    let result = await Message.findByIdAndUpdate(id, data);
    return result;
}

module.exports = {
    get,
    findOne,
    findMany,
    create,
    findByIdAndUpdate
}