import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_store.dart';
import '../../widgets/password_field.dart';

const passwordRequirementsHint =
    'At least 8 characters, with an uppercase letter, a number, and a special character (not *)';

/// Mirrors the web app's components/ChangePasswordForm.tsx.
class SecurityTab extends StatefulWidget {
  const SecurityTab({super.key});

  @override
  State<SecurityTab> createState() => _SecurityTabState();
}

class _SecurityTabState extends State<SecurityTab> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirm = TextEditingController();
  final _api = ApiClient();
  bool _submitting = false;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _current.dispose();
    _newPassword.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_newPassword.text != _confirm.text) {
      setState(() => _error = "New passwords don't match.");
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
      _success = false;
    });
    try {
      final token = context.read<AuthStore>().token!;
      await _api.changePassword(token, currentPassword: _current.text, newPassword: _newPassword.text);
      setState(() {
        _success = true;
        _current.clear();
        _newPassword.clear();
        _confirm.clear();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not change password: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: ListView(
        // shrinkWrap lets this size itself to its content instead of
        // demanding to fill an infinite viewport — needed because the
        // driver profile screen (profile_screen.dart) embeds this
        // directly inside its own outer ListView, and a scrollable
        // nested in a scrollable otherwise gets an unbounded height and
        // crashes on layout. Standalone (the customer profile's tab,
        // inside a plain Scaffold body) this behaves like a normal
        // ListView since that parent gives it a bounded height.
        shrinkWrap: true,
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Security', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Text('Change your account password.', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          if (_error != null) _Banner(text: _error!, color: Colors.red),
          if (_success) _Banner(text: 'Password changed.', color: Colors.green),
          const SizedBox(height: 8),
          PasswordField(
            controller: _current,
            labelText: 'Current password',
            validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
          ),
          const SizedBox(height: 12),
          PasswordField(
            controller: _newPassword,
            labelText: 'New password',
            validator: (v) => (v == null || v.length < 8) ? 'At least 8 characters' : null,
          ),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(passwordRequirementsHint, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ),
          const SizedBox(height: 12),
          PasswordField(
            controller: _confirm,
            labelText: 'Confirm new password',
            validator: (v) => (v == null || v.length < 8) ? 'At least 8 characters' : null,
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Change password'),
          ),
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  final String text;
  final Color color;
  const _Banner({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color)),
    );
  }
}
