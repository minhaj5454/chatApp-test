//Below function is just generating random 6 digit number which we are using as otp.

const otp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp
}

module.exports = otp;