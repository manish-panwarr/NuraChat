import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Mail, Phone, Calendar, User, Shield, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import userService from "../../services/userService";
import Avatar from "../../components/common/Avatar";
import { toast } from "react-hot-toast";

const ProfilePage = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        username: "",
        dob: "",
        gender: "",
        mobileNumber: "",
        statusText: "",
    });

    // Password change
    const [showPassForm, setShowPassForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [changingPass, setChangingPass] = useState(false);

    // Avatar upload
    const fileInputRef = useRef(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                username: user.username || "",
                dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
                gender: user.gender || "",
                mobileNumber: user.mobileNumber || "",
                statusText: user.statusText || "",
            });
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await userService.updateMyProfile(form);
            updateUser(res.user || form);
            toast.success("Profile updated!");
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!currentPassword || !newPassword) {
            toast.error("Fill in both fields");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        setChangingPass(true);
        try {
            await userService.changePassword({ currentPassword, newPassword });
            toast.success("Password changed!");
            setShowPassForm(false);
            setCurrentPassword("");
            setNewPassword("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password");
        } finally {
            setChangingPass(false);
        }
    };

    const handleAvatarClick = () => {
        if (!uploadingAvatar) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const res = await userService.uploadAvatar(file);
            updateUser(res.user);
            toast.success("Profile picture updated!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to upload image");
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };

    if (!user) return null;

    const InfoRow = ({ icon: Icon, label, value }) => (
        <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800/50">
            <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-gray-400" />
            </div>
            <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
                <p className="text-[13px] text-gray-700 dark:text-gray-200 font-medium">{value || "Not set"}</p>
            </div>
        </div>
    );

    return (
        <div className="h-screen flex flex-col" style={{ background: "var(--bg-color)" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
                <button
                    onClick={() => navigate("/")}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 font-display">My Profile</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-8">
                    {/* Profile Card */}
                    <div className="panel-glass p-8 mb-6">
                        {/* Avatar section */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <Avatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="xl" />
                                <div 
                                    onClick={handleAvatarClick}
                                    className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center cursor-pointer"
                                >
                                    {uploadingAvatar ? (
                                        <Loader2 size={24} className="text-white animate-spin" />
                                    ) : (
                                        <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100 font-display">
                                {user.firstName} {user.lastName}
                            </h2>
                            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                            {user.statusText && (
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-2 italic">"{user.statusText}"</p>
                            )}
                        </div>

                        {/* Info / Edit form */}
                        {!editing ? (
                            <div className="space-y-0">
                                <InfoRow icon={User} label="Username" value={user.username ? `@${user.username}` : null} />
                                <InfoRow icon={Mail} label="Email" value={user.email} />
                                <InfoRow icon={Phone} label="Mobile" value={user.mobileNumber} />
                                <InfoRow icon={Calendar} label="Date of Birth" value={user.dob ? new Date(user.dob).toLocaleDateString() : null} />
                                <InfoRow icon={User} label="Gender" value={user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : null} />

                                <button
                                    onClick={() => setEditing(true)}
                                    className="mt-6 w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-[14px] transition-colors shadow-sm"
                                >
                                    Edit Profile
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {[
                                    { key: "firstName", label: "First Name", type: "text" },
                                    { key: "lastName", label: "Last Name", type: "text" },
                                    { key: "username", label: "Username", type: "text" },
                                    { key: "mobileNumber", label: "Mobile Number", type: "tel" },
                                    { key: "dob", label: "Date of Birth", type: "date" },
                                    { key: "statusText", label: "Status", type: "text" },
                                ].map(({ key, label, type }) => (
                                    <div key={key}>
                                        <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium block mb-1">{label}</label>
                                        <input
                                            type={type}
                                            value={form[key]}
                                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 transition-colors"
                                        />
                                    </div>
                                ))}

                                <div>
                                    <label className="text-[11px] text-gray-400 uppercase tracking-wider font-medium block mb-1">Gender</label>
                                    <select
                                        value={form.gender}
                                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 transition-colors"
                                    >
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[14px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-[14px] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Security Section */}
                    <div className="panel-glass p-6">
                        <div className="flex items-center gap-2.5 mb-4">
                            <Shield size={18} className="text-gray-400" />
                            <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 font-display">Security</h3>
                        </div>

                        {!showPassForm ? (
                            <button
                                onClick={() => setShowPassForm(true)}
                                className="w-full py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium text-[13px] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Change Password
                            </button>
                        ) : (
                            <form onSubmit={handleChangePassword} className="space-y-3">
                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 transition-colors"
                                />
                                <input
                                    type="password"
                                    placeholder="New Password (min 6 chars)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] text-gray-700 dark:text-gray-200 outline-none focus:border-teal-400 transition-colors"
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowPassForm(false); setCurrentPassword(""); setNewPassword(""); }}
                                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-[13px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={changingPass}
                                        className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold text-[13px] transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {changingPass ? "Changing..." : "Change Password"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
